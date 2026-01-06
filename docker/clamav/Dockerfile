# ClamAV Antivirus Service for Render
# Cost: ~$7/month (Starter instance)

FROM clamav/clamav:stable

# Copy configuration files
COPY clamd.conf /etc/clamav/clamd.conf
COPY freshclam.conf /etc/clamav/freshclam.conf

# Copy entrypoint script and fix line endings (in case of Windows CRLF)
COPY entrypoint.sh /entrypoint.sh
RUN sed -i 's/\r$//' /entrypoint.sh && chmod +x /entrypoint.sh

# Ensure database directory exists with correct permissions
RUN mkdir -p /var/lib/clamav && \
    chown -R clamav:clamav /var/lib/clamav && \
    chmod 755 /var/lib/clamav

# ClamAV daemon listens on port 3310
EXPOSE 3310

# Health check - ping clamd every 60s
# Start period is 5 minutes to allow virus definition download
HEALTHCHECK --interval=60s --timeout=30s --start-period=300s --retries=5 \
  CMD clamdscan --ping 3 || exit 1

# Run as clamav user
USER clamav

# Use custom entrypoint that downloads definitions first
ENTRYPOINT ["/entrypoint.sh"]
