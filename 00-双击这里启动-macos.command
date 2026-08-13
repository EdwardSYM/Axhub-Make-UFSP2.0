#!/usr/bin/env bash

# 本机启动入口：进入项目目录后调用内部启动脚本。
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR" || exit 1

bash "./.macos-start-internal.sh"
