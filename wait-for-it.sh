#!/bin/sh
# wait-for-it.sh

set -e

host="$1"
shift
cmd="$@"

until nc -z "$host" "${host#*:}"; do
  echo "Waiting for $host - sleeping"
  sleep 1
done

echo "$host is up - executing command"
exec $cmd
