# ClamAV Antivirus Service for Render
# Cost: ~$7/month (Starter instance)
#
# The official clamav/clamav image handles everything:
# - Downloads virus definitions on startup
# - Runs freshclam daemon for updates
# - Runs clamd for scanning

FROM clamav/clamav:stable

# ClamAV daemon listens on port 3310
EXPOSE 3310

# Increase start period - virus definitions take 2-3 minutes to download
HEALTHCHECK --interval=60s --timeout=30s --start-period=300s --retries=5 \
  CMD clamdscan --ping 3 || exit 1

# Use the default entrypoint from the official image
# It handles freshclam + clamd automatically
