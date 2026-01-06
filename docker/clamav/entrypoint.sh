#!/bin/bash
set -e

echo "==> ClamAV Starting..."

# Check if virus definitions exist
if [ ! -f /var/lib/clamav/main.cvd ] && [ ! -f /var/lib/clamav/main.cld ]; then
    echo "==> No virus definitions found, downloading..."
    freshclam --foreground --stdout
    echo "==> Virus definitions downloaded successfully"
else
    echo "==> Virus definitions found, updating in background..."
    freshclam --foreground --stdout &
fi

echo "==> Starting ClamAV daemon on port 3310..."
exec clamd --foreground
