CC ?= cc
CFLAGS ?= -O2 -g
CFLAGS += -std=c11 -Wall -Wextra -Wpedantic
LDLIBS += -libverbs

.PHONY: all clean

all: learning_rc_pingpong

learning_rc_pingpong: learning_rc_pingpong.c
	$(CC) $(CFLAGS) $< -o $@ $(LDFLAGS) $(LDLIBS)

clean:
	$(RM) learning_rc_pingpong
