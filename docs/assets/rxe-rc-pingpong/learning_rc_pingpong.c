// SPDX-License-Identifier: MIT
/*
 * learning_rc_pingpong.c
 *
 * 一个刻意保持“小而完整”的 RC Send/Receive 学习程序：
 *   1. TCP 只负责交换 QPN/PSN/GID（控制面）；
 *   2. libibverbs 创建 PD/MR/CQ/QP；
 *   3. QP 按 RESET -> INIT -> RTR -> RTS 迁移；
 *   4. 真正的数据通过 RDMA Send/Receive 往返。
 *
 * 服务端：./learning_rc_pingpong -d rocev2_lo -i 1 -g 1
 * 客户端：./learning_rc_pingpong -d rocev2_lo -i 1 -g 1 127.0.0.1
 */

#define _POSIX_C_SOURCE 200809L

#include <arpa/inet.h>
#include <errno.h>
#include <getopt.h>
#include <infiniband/verbs.h>
#include <netdb.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/random.h>
#include <sys/socket.h>
#include <time.h>
#include <unistd.h>

enum {
	WRID_RECV = 1,
	WRID_SEND = 2,
	WIRE_DEST_SIZE = 26, /* QPN(4) + PSN(4) + LID(2) + GID(16) */
	CQ_TIMEOUT_SECONDS = 10,
};

struct config {
	const char *device_name;
	const char *server_name; /* NULL 表示服务端 */
	uint8_t ib_port;
	int gid_index;
	uint16_t tcp_port;
	uint32_t iterations;
	size_t message_size;
};

struct endpoint {
	uint32_t qpn;
	uint32_t psn;
	uint16_t lid;
	union ibv_gid gid;
};

struct resources {
	struct ibv_context *context;
	struct ibv_pd *pd;
	struct ibv_mr *mr;
	struct ibv_cq *cq;
	struct ibv_qp *qp;
	struct ibv_port_attr port_attr;
	void *buffer;
	char *tx_buffer;
	char *rx_buffer;
	size_t message_size;
};

static void usage(const char *program)
{
	fprintf(stderr,
		"Usage:\n"
		"  %s [options]             # server\n"
		"  %s [options] <server>    # client\n\n"
		"Options:\n"
		"  -d, --device NAME     RDMA device (default: first device)\n"
		"  -i, --ib-port N       RDMA port (default: 1)\n"
		"  -g, --gid-index N     GID index (default: 1)\n"
		"  -p, --tcp-port N      TCP control port (default: 18515)\n"
		"  -s, --size BYTES      Message size, at least 64 (default: 4096)\n"
		"  -n, --iterations N    Number of round trips (default: 1000)\n"
		"  -h, --help            Show this help\n",
		program, program);
}

static void die(const char *message)
{
	fprintf(stderr, "Error: %s\n", message);
	exit(EXIT_FAILURE);
}

static void die_errno(const char *operation)
{
	fprintf(stderr, "Error: %s: %s (errno=%d)\n",
		operation, strerror(errno), errno);
	exit(EXIT_FAILURE);
}

static void check_verbs(int rc, const char *operation)
{
	if (!rc)
		return;

	/* 大多数 libibverbs 调用返回正 errno；少数 provider 返回 -1 并设置 errno。 */
	if (rc > 0)
		errno = rc;
	die_errno(operation);
}

static unsigned long parse_unsigned(const char *text, unsigned long min,
				    unsigned long max, const char *name)
{
	char *end = NULL;
	unsigned long value;

	errno = 0;
	value = strtoul(text, &end, 10);
	if (errno || !end || *end != '\0' || value < min || value > max) {
		fprintf(stderr, "Error: %s must be in the range %lu..%lu; got: %s\n",
			name, min, max, text);
		exit(EXIT_FAILURE);
	}
	return value;
}

static uint32_t make_psn(void)
{
	uint32_t value = 0;

	if (getrandom(&value, sizeof(value), 0) != (ssize_t)sizeof(value))
		value = (uint32_t)time(NULL) ^ (uint32_t)getpid();
	return value & 0x00ffffffU; /* PSN 是 24 bit */
}

static void print_gid(const union ibv_gid *gid, char output[INET6_ADDRSTRLEN])
{
	if (!inet_ntop(AF_INET6, gid->raw, output, INET6_ADDRSTRLEN))
		strcpy(output, "<invalid-gid>");
}

static struct ibv_context *open_device(const char *wanted_name)
{
	struct ibv_device **devices;
	struct ibv_context *context = NULL;
	int count = 0;

	devices = ibv_get_device_list(&count);
	if (!devices)
		die_errno("ibv_get_device_list");
	if (count == 0)
		die("no RDMA devices found");

	for (int i = 0; i < count; ++i) {
		const char *name = ibv_get_device_name(devices[i]);

		if (!wanted_name || strcmp(wanted_name, name) == 0) {
			context = ibv_open_device(devices[i]);
			if (!context)
				die_errno("ibv_open_device");
			printf("[resource] Opened RDMA device: %s\n", name);
			break;
		}
	}

	ibv_free_device_list(devices);
	if (!context) {
		fprintf(stderr, "Error: RDMA device not found: %s\n", wanted_name);
		exit(EXIT_FAILURE);
	}
	return context;
}

static void resources_create(struct resources *res, const struct config *cfg)
{
	struct ibv_qp_init_attr qp_init = {0};
	long page_size = sysconf(_SC_PAGESIZE);

	memset(res, 0, sizeof(*res));
	res->message_size = cfg->message_size;
	res->context = open_device(cfg->device_name);

	check_verbs(ibv_query_port(res->context, cfg->ib_port, &res->port_attr),
		    "ibv_query_port");

	res->pd = ibv_alloc_pd(res->context);
	if (!res->pd)
		die_errno("ibv_alloc_pd");

	if (page_size <= 0)
		page_size = 4096;
	if (posix_memalign(&res->buffer, (size_t)page_size,
			   cfg->message_size * 2) != 0)
		die("posix_memalign failed");
	memset(res->buffer, 0, cfg->message_size * 2);
	res->tx_buffer = res->buffer;
	res->rx_buffer = res->tx_buffer + cfg->message_size;

	/* MR 把普通虚拟内存注册给 RDMA 子系统，并产生 lkey/rkey。 */
	res->mr = ibv_reg_mr(res->pd, res->buffer, cfg->message_size * 2,
			     IBV_ACCESS_LOCAL_WRITE);
	if (!res->mr)
		die_errno("ibv_reg_mr");

	res->cq = ibv_create_cq(res->context, 16, NULL, NULL, 0);
	if (!res->cq)
		die_errno("ibv_create_cq");

	qp_init.send_cq = res->cq;
	qp_init.recv_cq = res->cq;
	qp_init.qp_type = IBV_QPT_RC;
	qp_init.sq_sig_all = 1; /* 每个 Send 都产生 CQE，便于学习。 */
	qp_init.cap.max_send_wr = 4;
	qp_init.cap.max_recv_wr = 4;
	qp_init.cap.max_send_sge = 1;
	qp_init.cap.max_recv_sge = 1;

	res->qp = ibv_create_qp(res->pd, &qp_init);
	if (!res->qp)
		die_errno("ibv_create_qp");

	printf("[resource] Created PD/MR/CQ/RC QP, QPN=0x%06x lkey=0x%x\n",
	       res->qp->qp_num, res->mr->lkey);
}

static void resources_destroy(struct resources *res)
{
	if (res->qp)
		ibv_destroy_qp(res->qp);
	if (res->cq)
		ibv_destroy_cq(res->cq);
	if (res->mr)
		ibv_dereg_mr(res->mr);
	free(res->buffer);
	if (res->pd)
		ibv_dealloc_pd(res->pd);
	if (res->context)
		ibv_close_device(res->context);
}

static void qp_to_init(struct resources *res, const struct config *cfg)
{
	struct ibv_qp_attr attr = {0};

	attr.qp_state = IBV_QPS_INIT;
	attr.port_num = cfg->ib_port;
	attr.pkey_index = 0;
	attr.qp_access_flags = 0; /* 本例只演示 Send/Receive。 */

	check_verbs(ibv_modify_qp(res->qp, &attr,
				  IBV_QP_STATE | IBV_QP_PORT |
				  IBV_QP_PKEY_INDEX | IBV_QP_ACCESS_FLAGS),
		    "QP RESET -> INIT");
	printf("[QP] RESET -> INIT\n");
}

static void qp_to_rtr_rts(struct resources *res, const struct config *cfg,
			  const struct endpoint *remote, uint32_t local_psn)
{
	struct ibv_qp_attr attr = {0};

	attr.qp_state = IBV_QPS_RTR;
	attr.path_mtu = res->port_attr.active_mtu;
	attr.dest_qp_num = remote->qpn;
	attr.rq_psn = remote->psn;
	attr.max_dest_rd_atomic = 1;
	attr.min_rnr_timer = 12;
	attr.ah_attr.is_global = 1;
	attr.ah_attr.dlid = remote->lid;
	attr.ah_attr.sl = 0;
	attr.ah_attr.src_path_bits = 0;
	attr.ah_attr.port_num = cfg->ib_port;
	attr.ah_attr.grh.dgid = remote->gid;
	attr.ah_attr.grh.sgid_index = cfg->gid_index;
	attr.ah_attr.grh.hop_limit = 64;

	check_verbs(ibv_modify_qp(res->qp, &attr,
				  IBV_QP_STATE | IBV_QP_AV | IBV_QP_PATH_MTU |
				  IBV_QP_DEST_QPN | IBV_QP_RQ_PSN |
				  IBV_QP_MAX_DEST_RD_ATOMIC |
				  IBV_QP_MIN_RNR_TIMER),
		    "QP INIT -> RTR (if errno is ENETUNREACH, check the IP and route for the GID)");
	printf("[QP] INIT -> RTR\n");

	memset(&attr, 0, sizeof(attr));
	attr.qp_state = IBV_QPS_RTS;
	attr.timeout = 14;
	attr.retry_cnt = 7;
	attr.rnr_retry = 7; /* 7 表示无限 RNR 重试。 */
	attr.sq_psn = local_psn;
	attr.max_rd_atomic = 1;

	check_verbs(ibv_modify_qp(res->qp, &attr,
				  IBV_QP_STATE | IBV_QP_TIMEOUT |
				  IBV_QP_RETRY_CNT | IBV_QP_RNR_RETRY |
				  IBV_QP_SQ_PSN | IBV_QP_MAX_QP_RD_ATOMIC),
		    "QP RTR -> RTS");
	printf("[QP] RTR -> RTS\n");
}

static void post_receive(struct resources *res)
{
	struct ibv_sge sge = {
		.addr = (uintptr_t)res->rx_buffer,
		.length = (uint32_t)res->message_size,
		.lkey = res->mr->lkey,
	};
	struct ibv_recv_wr wr = {
		.wr_id = WRID_RECV,
		.sg_list = &sge,
		.num_sge = 1,
	};
	struct ibv_recv_wr *bad = NULL;

	check_verbs(ibv_post_recv(res->qp, &wr, &bad), "ibv_post_recv");
}

static void post_send(struct resources *res)
{
	struct ibv_sge sge = {
		.addr = (uintptr_t)res->tx_buffer,
		.length = (uint32_t)res->message_size,
		.lkey = res->mr->lkey,
	};
	struct ibv_send_wr wr = {
		.wr_id = WRID_SEND,
		.sg_list = &sge,
		.num_sge = 1,
		.opcode = IBV_WR_SEND,
		.send_flags = IBV_SEND_SIGNALED,
	};
	struct ibv_send_wr *bad = NULL;

	check_verbs(ibv_post_send(res->qp, &wr, &bad), "ibv_post_send");
}

static uint64_t monotonic_seconds(void)
{
	struct timespec ts;

	if (clock_gettime(CLOCK_MONOTONIC, &ts) != 0)
		die_errno("clock_gettime");
	return (uint64_t)ts.tv_sec;
}

static uint64_t monotonic_nanoseconds(void)
{
	struct timespec ts;

	if (clock_gettime(CLOCK_MONOTONIC, &ts) != 0)
		die_errno("clock_gettime");
	return (uint64_t)ts.tv_sec * 1000000000ULL + (uint64_t)ts.tv_nsec;
}

static uint64_t wait_completion(struct resources *res)
{
	struct ibv_wc wc;
	uint64_t deadline = monotonic_seconds() + CQ_TIMEOUT_SECONDS;

	for (;;) {
		int count = ibv_poll_cq(res->cq, 1, &wc);

		if (count < 0)
			die("ibv_poll_cq returned a negative value");
		if (count == 1) {
			if (wc.status != IBV_WC_SUCCESS) {
				fprintf(stderr,
					"Error: CQE status=%s (%d), opcode=%d, wr_id=%lu\n",
					ibv_wc_status_str(wc.status), wc.status,
					wc.opcode, (unsigned long)wc.wr_id);
				exit(EXIT_FAILURE);
			}
			return wc.wr_id;
		}
		if (monotonic_seconds() >= deadline)
			die("timed out waiting for a CQE; check both GIDs, QP states, and whether the server posted a Receive WR");
	}
}

static void wait_for_id(struct resources *res, uint64_t wanted)
{
	uint64_t got = wait_completion(res);

	if (got != wanted) {
		fprintf(stderr, "Error: expected wr_id=%lu, got %lu\n",
			(unsigned long)wanted, (unsigned long)got);
		exit(EXIT_FAILURE);
	}
}

static void wait_send_and_receive(struct resources *res)
{
	unsigned int seen = 0;

	while (seen != 3) {
		uint64_t id = wait_completion(res);
		unsigned int bit;

		if (id == WRID_RECV)
			bit = 1;
		else if (id == WRID_SEND)
			bit = 2;
		else
			die("received an unknown wr_id");
		if (seen & bit)
			die("received a duplicate CQE");
		seen |= bit;
	}
}

static ssize_t write_full(int fd, const void *buffer, size_t length)
{
	const uint8_t *cursor = buffer;
	size_t done = 0;

	while (done < length) {
		ssize_t count = send(fd, cursor + done, length - done, MSG_NOSIGNAL);
		if (count < 0 && errno == EINTR)
			continue;
		if (count <= 0)
			return -1;
		done += (size_t)count;
	}
	return (ssize_t)done;
}

static ssize_t read_full(int fd, void *buffer, size_t length)
{
	uint8_t *cursor = buffer;
	size_t done = 0;

	while (done < length) {
		ssize_t count = recv(fd, cursor + done, length - done, 0);
		if (count < 0 && errno == EINTR)
			continue;
		if (count <= 0)
			return -1;
		done += (size_t)count;
	}
	return (ssize_t)done;
}

static int tcp_server_accept(uint16_t port)
{
	struct sockaddr_in address = {0};
	int listener;
	int connection;
	int yes = 1;

	listener = socket(AF_INET, SOCK_STREAM, 0);
	if (listener < 0)
		die_errno("socket(server)");
	setsockopt(listener, SOL_SOCKET, SO_REUSEADDR, &yes, sizeof(yes));

	address.sin_family = AF_INET;
	address.sin_addr.s_addr = htonl(INADDR_ANY);
	address.sin_port = htons(port);
	if (bind(listener, (struct sockaddr *)&address, sizeof(address)) != 0)
		die_errno("bind");
	if (listen(listener, 1) != 0)
		die_errno("listen");

	printf("[control] Waiting for a TCP connection on 0.0.0.0:%u ...\n", port);
	connection = accept(listener, NULL, NULL);
	if (connection < 0)
		die_errno("accept");
	close(listener);
	return connection;
}

static int tcp_client_connect(const char *server, uint16_t port)
{
	struct addrinfo hints = {0};
	struct addrinfo *result = NULL;
	struct addrinfo *item;
	char service[16];
	int fd = -1;
	int rc;

	hints.ai_family = AF_INET;
	hints.ai_socktype = SOCK_STREAM;
	snprintf(service, sizeof(service), "%u", port);
	rc = getaddrinfo(server, service, &hints, &result);
	if (rc != 0) {
		fprintf(stderr, "Error: getaddrinfo(%s): %s\n", server,
			gai_strerror(rc));
		exit(EXIT_FAILURE);
	}

	for (item = result; item; item = item->ai_next) {
		fd = socket(item->ai_family, item->ai_socktype, item->ai_protocol);
		if (fd >= 0 && connect(fd, item->ai_addr, item->ai_addrlen) == 0)
			break;
		if (fd >= 0)
			close(fd);
		fd = -1;
	}
	freeaddrinfo(result);
	if (fd < 0)
		die_errno("connect TCP control channel");
	printf("[control] Connected to %s:%u\n", server, port);
	return fd;
}

static void put_u32(uint8_t *output, uint32_t value)
{
	value = htonl(value);
	memcpy(output, &value, sizeof(value));
}

static uint32_t get_u32(const uint8_t *input)
{
	uint32_t value;

	memcpy(&value, input, sizeof(value));
	return ntohl(value);
}

static void endpoint_encode(const struct endpoint *endpoint,
			    uint8_t output[WIRE_DEST_SIZE])
{
	uint16_t lid = htons(endpoint->lid);

	put_u32(output, endpoint->qpn);
	put_u32(output + 4, endpoint->psn);
	memcpy(output + 8, &lid, sizeof(lid));
	memcpy(output + 10, endpoint->gid.raw, 16);
}

static void endpoint_decode(const uint8_t input[WIRE_DEST_SIZE],
			    struct endpoint *endpoint)
{
	uint16_t lid;

	endpoint->qpn = get_u32(input);
	endpoint->psn = get_u32(input + 4);
	memcpy(&lid, input + 8, sizeof(lid));
	endpoint->lid = ntohs(lid);
	memcpy(endpoint->gid.raw, input + 10, 16);
}

static void exchange_endpoints(int fd, const struct endpoint *local,
			       struct endpoint *remote)
{
	uint8_t outgoing[WIRE_DEST_SIZE];
	uint8_t incoming[WIRE_DEST_SIZE];

	endpoint_encode(local, outgoing);
	/* 双方都先写再读；消息很小，不会填满 TCP send buffer。 */
	if (write_full(fd, outgoing, sizeof(outgoing)) < 0)
		die_errno("send local QP information");
	if (read_full(fd, incoming, sizeof(incoming)) < 0)
		die_errno("read remote QP information");
	endpoint_decode(incoming, remote);
}

static void tcp_barrier(int fd, int is_client)
{
	const uint8_t ready = 0xa5;
	uint8_t peer = 0;

	if (is_client) {
		if (write_full(fd, &ready, 1) < 0 || read_full(fd, &peer, 1) < 0)
			die_errno("TCP barrier(client)");
	} else {
		if (read_full(fd, &peer, 1) < 0 || write_full(fd, &ready, 1) < 0)
			die_errno("TCP barrier(server)");
	}
	if (peer != ready)
		die("invalid TCP barrier payload");
}

static void run_server(struct resources *res, const struct config *cfg)
{
	for (uint32_t i = 0; i < cfg->iterations; ++i) {
		memset(res->rx_buffer, 0, res->message_size);
		post_receive(res);
		wait_for_id(res, WRID_RECV);

		snprintf(res->tx_buffer, res->message_size,
			 "pong iteration=%u, server received=[%.*s]", i,
			 (int)(res->message_size / 2), res->rx_buffer);
		post_send(res);
		wait_for_id(res, WRID_SEND);
	}
}

static void run_client(struct resources *res, const struct config *cfg)
{
	uint64_t started = monotonic_nanoseconds();

	for (uint32_t i = 0; i < cfg->iterations; ++i) {
		memset(res->rx_buffer, 0, res->message_size);
		snprintf(res->tx_buffer, res->message_size,
			 "ping iteration=%u from RC client", i);

		/* 必须先 Post Receive，再 Send；否则对端回复时可能触发 RNR。 */
		post_receive(res);
		post_send(res);
		wait_send_and_receive(res);

		if (i < 3 || i + 1 == cfg->iterations)
			printf("[data] %s\n", res->rx_buffer);
	}
	uint64_t elapsed = monotonic_nanoseconds() - started;
	double elapsed_ms = (double)elapsed / 1000000.0;
	double average_us = (double)elapsed / 1000.0 / cfg->iterations;

	printf("[complete] %u RC ping-pong round trips in %.3f ms, average %.3f us/round trip\n",
	       cfg->iterations, elapsed_ms, average_us);
}

int main(int argc, char **argv)
{
	struct config cfg = {
		.device_name = NULL,
		.server_name = NULL,
		.ib_port = 1,
		.gid_index = 1,
		.tcp_port = 18515,
		.iterations = 1000,
		.message_size = 4096,
	};
	static const struct option options[] = {
		{"device", required_argument, NULL, 'd'},
		{"ib-port", required_argument, NULL, 'i'},
		{"gid-index", required_argument, NULL, 'g'},
		{"tcp-port", required_argument, NULL, 'p'},
		{"size", required_argument, NULL, 's'},
		{"iterations", required_argument, NULL, 'n'},
		{"help", no_argument, NULL, 'h'},
		{NULL, 0, NULL, 0},
	};
	struct resources res;
	struct endpoint local = {0};
	struct endpoint remote = {0};
	char local_gid[INET6_ADDRSTRLEN];
	char remote_gid[INET6_ADDRSTRLEN];
	int control_fd;
	int option;
	int is_client;

	while ((option = getopt_long(argc, argv, "d:i:g:p:s:n:h", options,
				     NULL)) != -1) {
		switch (option) {
		case 'd': cfg.device_name = optarg; break;
		case 'i': cfg.ib_port = (uint8_t)parse_unsigned(optarg, 1, 255,
							       "ib-port"); break;
		case 'g': cfg.gid_index = (int)parse_unsigned(optarg, 0, 65535,
							       "gid-index"); break;
		case 'p': cfg.tcp_port = (uint16_t)parse_unsigned(optarg, 1, 65535,
								"tcp-port"); break;
		case 's': cfg.message_size = parse_unsigned(optarg, 64, 1UL << 30,
							      "size"); break;
		case 'n': cfg.iterations = (uint32_t)parse_unsigned(optarg, 1,
								  UINT32_MAX,
								  "iterations"); break;
		case 'h': usage(argv[0]); return EXIT_SUCCESS;
		default: usage(argv[0]); return EXIT_FAILURE;
		}
	}
	if (argc - optind > 1) {
		usage(argv[0]);
		return EXIT_FAILURE;
	}
	if (argc - optind == 1)
		cfg.server_name = argv[optind];
	is_client = cfg.server_name != NULL;

	printf("[mode] %s, RDMA port=%u, GID index=%d\n",
	       is_client ? "client" : "server", cfg.ib_port, cfg.gid_index);
	resources_create(&res, &cfg);
	qp_to_init(&res, &cfg);

	local.qpn = res.qp->qp_num;
	local.psn = make_psn();
	local.lid = res.port_attr.lid;
	check_verbs(ibv_query_gid(res.context, cfg.ib_port, cfg.gid_index,
				  &local.gid), "ibv_query_gid");
	print_gid(&local.gid, local_gid);
	printf("[local] LID=0x%04x QPN=0x%06x PSN=0x%06x GID=%s\n",
	       local.lid, local.qpn, local.psn, local_gid);

	control_fd = is_client ? tcp_client_connect(cfg.server_name, cfg.tcp_port)
			       : tcp_server_accept(cfg.tcp_port);
	exchange_endpoints(control_fd, &local, &remote);
	print_gid(&remote.gid, remote_gid);
	printf("[remote] LID=0x%04x QPN=0x%06x PSN=0x%06x GID=%s\n",
	       remote.lid, remote.qpn, remote.psn, remote_gid);

	qp_to_rtr_rts(&res, &cfg, &remote, local.psn);
	tcp_barrier(control_fd, is_client);
	close(control_fd); /* 从此处开始，数据传输不再依赖 TCP。 */
	printf("[control] QP parameter exchange complete; TCP closed; starting the RDMA data path\n");

	if (is_client)
		run_client(&res, &cfg);
	else
		run_server(&res, &cfg);

	resources_destroy(&res);
	return EXIT_SUCCESS;
}
