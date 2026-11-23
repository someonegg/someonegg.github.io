# 数据误删恢复和安全擦除

误删后的恢复取决于三个条件：是否还有独立副本、原数据块是否仍可读取，以及是否能重建文件的布局。安全擦除（Secure Erase）要达到相反的目标：让目标介质上的数据在预定的技术能力和成本下无法恢复。文件系统、存储控制器和物理介质各自保留的信息，决定了两类操作的边界。

## 1. 删除文件后还剩下什么

移入回收站通常只是移动文件或改变其记录，所以可以直接还原。永久删除通常会移除目录引用，并把文件占用的空间标记为可重用。文件名、大小、时间戳和数据块位置等元数据可能仍有残留，内容也可能暂时留在原处。具体行为随文件系统、删除方式和设备而异。快速格式化会写入新的文件系统结构，可能覆盖关键元数据。能否恢复仍取决于原数据、元数据以及设备收到的丢弃请求。 [Microsoft Windows File Recovery](https://support.microsoft.com/en-us/windows/experience/backup-recovery/windows-file-recovery)

| 介质 | 释放空间后的典型行为 | 对恢复的影响 |
| --- | --- | --- |
| HDD | 常见情况下，原磁记录会保留到相应扇区被覆盖。 | 覆盖前可能通过元数据或扫描找回。真正被覆盖的扇区无法依靠普通恢复软件还原。 |
| SSD | 文件系统可能下发 TRIM（ATA）或 Deallocate（NVMe），通过存储栈通知控制器相关逻辑块可以回收。控制器可先使旧数据无法通过接口读取，再由垃圾回收擦除 NAND 块。 | 原 NAND 页可能仍有残留，但常规工具只能读取控制器暴露的逻辑块。TRIM 未下发或未透传时，如果旧数据块仍可读，仍可尝试恢复。 |

SSD 的闪存转换层（FTL）负责逻辑地址到物理页的映射。磨损均衡、预留空间和坏块重映射都会让两者不再一一对应。TRIM 执行后，逻辑读取得到零或其他协议允许的结果，具体取决于设备行为。USB 转接桥、RAID 和虚拟磁盘也会影响丢弃请求是否抵达实际设备。因此，「没有继续写入」对 HDD 有利，对 SSD 则还要看控制器是否已经使原数据不可读。 [Microsoft TRIM 与 Unmap 说明](https://learn.microsoft.com/en-us/windows/compatibility/new-api-allows-apps-to-send-trim-and-unmap-hints) · [NVM Express Base Specification](https://nvmexpress.org/wp-content/uploads/NVM-Express-Base-Specification-Revision-2.3-2025.08.01-Ratified.pdf)

## 2. 恢复方法与适用条件

| 方法 | 原理 | 适用条件与局限 |
| --- | --- | --- |
| 回收站、快照、版本历史和备份 | 找回仍被引用的文件，或取回删除前保存的版本。 | 优先检查。快照必须在误删前存在且仍可访问。独立备份可用于原盘失效或被擦除后的恢复。 |
| 文件系统恢复 | 解析残留目录记录、分配表或文件记录，例如 NTFS 的 MFT，从中定位文件的数据块。 | 有机会保留文件名和目录结构。映射丢失、部分块被覆盖或被丢弃时，可能只剩不完整内容。 |
| 文件特征扫描（file carving） | 从原盘镜像中搜索 JPEG、PDF 等格式的签名和内部结构，按格式边界提取数据。 | 文件系统结构损坏时仍可尝试。通常丢失原文件名和目录，碎片化文件也更难完整拼回。 |
| 故障介质镜像与专业恢复 | 对仍可识别的故障盘优先复制可读区域，记录坏区，在镜像上做后续分析。无法稳定识别或有机械损伤时，先由实验室评估。 | GNU ddrescue 可记录复制进度并跳过难读区域。SSD 的芯片读取还受 FTL、纠错、数据扰码和控制器加密限制。 |

### 按文件系统选择恢复工具

文件系统恢复会尝试把残留的文件记录与数据块对应起来。只要记录中的文件名、目录关系和块映射仍可用，就有机会恢复原始路径和碎片化文件。选工具时先确认卷的文件系统，再判断是文件误删、分区丢失，还是文件系统损坏。同一个工具可能支持识别或修复某种文件系统，但只对其中一部分提供误删恢复。

| 文件系统 | 可用工具 | 恢复依据与局限 |
| --- | --- | --- |
| NTFS | TestDisk 的 Undelete。Windows File Recovery 对近期误删可先试 Regular，删除较久、格式化或卷损坏可试 Extensive。 | TestDisk 扫描主文件表（MFT）中的已删除记录。如果记录和原数据块仍可读，有机会保留原文件名。 [TestDisk NTFS 文档](https://www.cgsecurity.org/testdisk_doc/undelete_ntfs.html) · [Microsoft Windows File Recovery](https://support.microsoft.com/en-us/windows/experience/backup-recovery/windows-file-recovery) |
| FAT12/16/32、exFAT | TestDisk。Windows 下可用 Windows File Recovery 的 Extensive 模式。 | TestDisk 可从残留目录项定位文件起始位置。原簇未被重用时才可能完整恢复，碎片化会增加重建难度。 [TestDisk FAT 与 exFAT 文档](https://www.cgsecurity.org/testdisk_doc/undelete_fat.html) · [Microsoft Windows File Recovery](https://support.microsoft.com/en-us/windows/experience/backup-recovery/windows-file-recovery) |
| ext2 | TestDisk 的 Undelete。 | 可利用残留文件记录和块位置。此用法适用于 ext2，TestDisk 对 ext3、ext4 的分区识别和文件复制功能属于其他操作。 [TestDisk ext2 文档](https://www.cgsecurity.org/testdisk_doc/undelete_fat.html) |
| ext3、ext4 | ext4magic、extundelete。 | 尝试从文件系统日志（journal）找到删除前的 inode 等元数据，再定位原数据块。日志被循环覆盖、原块被重用或丢弃后，恢复机会会下降。还应核对工具版本对该卷所启用特性的支持。 [ext4magic 文档](https://ext4magic.sourceforge.net/ext4magic_en.html) · [extundelete 文档](https://extundelete.sourceforge.net/) |
| APFS | 有误删前的快照或备份时先用 Time Machine。没有副本时，可尝试 UFS Explorer Standard Recovery。 | 快照可提供旧版本。直接扫描取决于残留元数据、SSD TRIM 和加密状态。加密卷需要可用的解锁凭据。 [Apple Time Machine 本地快照](https://support.apple.com/en-ca/102154) · [UFS Explorer 功能文档](https://www.ufsexplorer.com/manual/standard/software-overview/) |
| HFS+ | Time Machine 备份、UFS Explorer Standard Recovery。 | 误删可能移除关键目录记录。原路径无法重建时，可改用 PhotoRec 等工具按文件特征提取内容。 [R-Studio 的 HFS+ 恢复说明](https://r-studio.com/Linux_Help/data_recovery_on_hfshfs_file_s.html?nav=index) · [UFS Explorer 功能文档](https://www.ufsexplorer.com/manual/standard/software-overview/) |
| Btrfs | 先查误删前的子卷快照。文件系统损坏时可用 `btrfs restore` 提取可读文件。无快照的误删可尝试 UFS Explorer。 | 快照必须包含目标文件所在子卷。 `btrfs restore` 主要从受损卷中复制元数据仍可定位的文件。 [Btrfs restore 手册](https://btrfs.readthedocs.io/en/latest/btrfs-restore.html) · [UFS Explorer 功能文档](https://www.ufsexplorer.com/manual/standard/software-overview/) |
| XFS | 可在镜像上尝试 UFS Explorer Standard Recovery 或 R-Studio。 | 恢复取决于剩余的元数据和数据块。卷一致性修复与文件误删恢复是两类操作，先保留原始镜像再考虑修复。 [UFS Explorer 功能文档](https://www.ufsexplorer.com/manual/standard/software-overview/) · [R-Studio XFS 恢复说明](https://www.r-studio.com/XFS-recovery.html) |

元数据不足时，可以退回到 PhotoRec 的文件特征扫描。源盘出现读错误时，GNU ddrescue 可先尽量复制可读块，再把镜像交给对应的文件系统恢复工具。 [PhotoRec 文档](https://www.cgsecurity.org/testdisk_doc/photorec.html) · [GNU ddrescue 手册](https://www.gnu.org/software/ddrescue/manual/ddrescue_manual.html)

### 误删后的操作顺序

1. 停止使用源盘。暂停写入，把恢复工具和恢复输出都放到另一块物理盘。有条件时以只读方式接入。
2. 从其他设备检查回收站、同步服务的历史版本、快照和备份。恢复到独立位置后，先打开文件确认内容。
3. 没有副本时，优先对源盘做镜像，再在镜像上尝试元数据恢复或文件特征扫描。避免先格式化或运行会修改源盘的文件系统修复。
4. 硬盘出现异常响声、频繁掉盘或无法稳定识别时，停止反复通电和扫描。关键数据可交给专业机构。加密盘还需要保留可用的解锁凭据或恢复密钥。

## 3. Secure Erase 如何让数据无法恢复

NIST SP 800-88 Rev. 2 将介质清除分为 **Clear**、**Purge** 和 **Destroy**。Clear 面向通过常规接口进行的恢复，Purge 要使先进实验室手段也难以恢复，同时保留介质的潜在复用能力，Destroy 则使介质无法再用于存储。方法的选择取决于数据敏感度、介质能力和后续去向。 [NIST SP 800-88 Rev. 2](https://csrc.nist.gov/pubs/sp/800/88/r2/final)

同一种技术可能达到不同级别。判断时要看它覆盖了哪些目标数据、设备是否正确执行，以及执行结果是否满足所要求的清除级别。NIST §3.1 将具体介质可接受的 Purge 技术指向 IEEE 2883。 [NIST SP 800-88 Rev. 2 §3.1](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-88r2.pdf#page=17)

| 技术 | 可达到的级别 | 效果与条件 |
| --- | --- | --- |
| 主机覆盖（标准写入） | **Clear** | 覆盖 HDD 全部用户可寻址空间后，原数据无法通过常规接口恢复。通常一次完整覆盖即可。重映射扇区、预留区和 SSD 的旧物理页可能仍有残留，多写几遍也无法扩大可寻址范围。 |
| 设备级覆盖（Sanitize Overwrite） | 符合条件时可达到 **Purge** | 由控制器按设备清除规范执行，可处理普通写入触及不到的区域。须确认该介质和实现符合适用规范，覆盖所有目标数据，并成功完成。 |
| 块擦除（Block Erase） | 符合条件时可达到 **Purge** | 由 SSD 控制器执行低层擦除。须确认命令覆盖所有可能存放目标数据的闪存区域，包括普通读写无法触及的区域，并成功完成。 |
| 加密擦除（Cryptographic Erase） | 符合条件时可达到 **Purge** | 密文可以留在介质上。目标数据从写入起就须受到足够强的加密保护，且用于解密的密钥须被清除或无法再恢复，包括通过备份或托管恢复的路径。曾经写入的明文以及其他介质上的副本需要另行处理。 |
| 物理销毁 | 符合条件时可达到 **Destroy** | 按适用规范破坏 HDD 的盘片或 SSD 的 NAND 芯片，使介质无法复用，且先进实验室手段也难以恢复目标数据。适用于无法执行或验证清除的故障盘，或要求销毁的介质。 |

Secure Erase 既可泛指安全擦除，也常指具体设备功能。SATA 的 ATA Security Erase Unit 与 ATA Sanitize 是不同的命令机制，实际行为须查型号文档。NVMe 的 **Format NVM** 可通过 Secure Erase Settings 请求用户数据擦除或加密擦除，作用范围取决于设备能力。NVMe **Sanitize** 可提供块擦除、覆盖和加密擦除，具体操作由设备声明支持。普通文件系统格式化只在主机侧创建或重建文件系统。TRIM 告知设备空间可回收，无法证明物理块已经擦除或所有内部副本都已处理。 [NVM Express 安全擦除说明](https://nvmexpress.org/faq-items/how-do-you-securely-erase-data-on-an-nvme-ssd/) · [Seagate 擦除功能对照](https://www.seagate.com/support/secure-erase-matrix/)

### 擦除后的验证

先确认需要保留的数据已有可读备份，再按设备序列号核对目标盘和擦除范围。选用厂商支持的连接方式和擦除工具，确认命令已执行完成。例如，NVMe Sanitize 可查看 Sanitize Status Log。可见扇区读回为零只能说明检查到的地址返回了零，内部区域的覆盖范围要结合协议、设备实现和完成状态判断。处置记录可保留设备标识、执行方法、范围、时间和结果。云同步副本、快照和备份有独立的保留周期，应按各自所在位置处理。 [NIST SP 800-88 Rev. 2](https://csrc.nist.gov/pubs/sp/800/88/r2/final) · [NVM Express Base Specification](https://nvmexpress.org/wp-content/uploads/NVM-Express-Base-Specification-Revision-2.3-2025.08.01-Ratified.pdf)
