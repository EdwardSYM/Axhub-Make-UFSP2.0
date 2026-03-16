# 主动沉淀记忆日志

> 用途：用最少 token 记录主动沉淀记忆动作。
> 规则：一行一条，按时间倒序追加；无内容统一写 `-`。
> 字段：`时间 | kind | src | sum | doc | theme | data | git | todo`
> `kind`：`upd`=普通维护，`trim`=日志裁剪

{{DATE}} | upd | {{TRIGGER}} | {{SUMMARY}} | {{DOC_CHANGES}} | {{THEME_CHANGES}} | {{DATA_CHANGES}} | {{GIT_COMMIT}} | {{FOLLOW_UP}}

{{DATE}} | trim | sys | 删旧100行 | - | - | - | - | 保留较新记录
