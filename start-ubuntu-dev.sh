#!/bin/bash
set -euo pipefail

exec /usr/sbin/sshd -D -e
