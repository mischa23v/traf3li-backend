# ClamAV Antivirus Service for Render
# Cost: ~$7/month (Starter instance)

FROM clamav/clamav:latest

# Expose the ClamAV daemon port
EXPOSE 3310

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD clamdcheck || exit 1

# Start ClamAV daemon
CMD ["clamd", "--foreground"]
