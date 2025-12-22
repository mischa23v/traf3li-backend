/**
 * URL Validator Tests
 * Tests for SSRF protection in webhook URLs
 */

const {
    isPrivateIP,
    isDangerousHost,
    validateWebhookUrl,
    validateWebhookUrlSync,
    resolveAndValidateHostname,
    METADATA_IPS
} = require('../../../src/utils/urlValidator');

describe('URL Validator - SSRF Protection', () => {
    describe('isPrivateIP', () => {
        describe('IPv4 - Private Ranges', () => {
            it('should detect 127.0.0.0/8 (localhost)', () => {
                expect(isPrivateIP('127.0.0.1')).toBe(true);
                expect(isPrivateIP('127.0.0.0')).toBe(true);
                expect(isPrivateIP('127.255.255.255')).toBe(true);
                expect(isPrivateIP('127.1.2.3')).toBe(true);
            });

            it('should detect 10.0.0.0/8 (private network)', () => {
                expect(isPrivateIP('10.0.0.0')).toBe(true);
                expect(isPrivateIP('10.0.0.1')).toBe(true);
                expect(isPrivateIP('10.255.255.255')).toBe(true);
                expect(isPrivateIP('10.123.45.67')).toBe(true);
            });

            it('should detect 172.16.0.0/12 (private network)', () => {
                expect(isPrivateIP('172.16.0.0')).toBe(true);
                expect(isPrivateIP('172.16.0.1')).toBe(true);
                expect(isPrivateIP('172.31.255.255')).toBe(true);
                expect(isPrivateIP('172.20.10.5')).toBe(true);
            });

            it('should detect 192.168.0.0/16 (private network)', () => {
                expect(isPrivateIP('192.168.0.0')).toBe(true);
                expect(isPrivateIP('192.168.0.1')).toBe(true);
                expect(isPrivateIP('192.168.255.255')).toBe(true);
                expect(isPrivateIP('192.168.1.100')).toBe(true);
            });

            it('should detect 169.254.0.0/16 (link-local)', () => {
                expect(isPrivateIP('169.254.0.0')).toBe(true);
                expect(isPrivateIP('169.254.169.254')).toBe(true);
                expect(isPrivateIP('169.254.255.255')).toBe(true);
            });

            it('should detect 0.0.0.0/8 (reserved)', () => {
                expect(isPrivateIP('0.0.0.0')).toBe(true);
                expect(isPrivateIP('0.0.0.1')).toBe(true);
                expect(isPrivateIP('0.255.255.255')).toBe(true);
            });

            it('should detect broadcast address', () => {
                expect(isPrivateIP('255.255.255.255')).toBe(true);
            });
        });

        describe('IPv4 - Cloud Metadata Endpoints', () => {
            it('should detect AWS/Azure/GCP metadata endpoint', () => {
                expect(isPrivateIP('169.254.169.254')).toBe(true);
                expect(METADATA_IPS.includes('169.254.169.254')).toBe(true);
            });

            it('should detect AWS alternate metadata endpoint', () => {
                expect(isPrivateIP('169.254.169.253')).toBe(true);
                expect(METADATA_IPS.includes('169.254.169.253')).toBe(true);
            });
        });

        describe('IPv6 - Private Ranges', () => {
            it('should detect ::1/128 (IPv6 localhost)', () => {
                expect(isPrivateIP('::1')).toBe(true);
                expect(isPrivateIP('[::1]')).toBe(true);
            });

            it('should detect fc00::/7 (IPv6 unique local)', () => {
                expect(isPrivateIP('fc00::1')).toBe(true);
                expect(isPrivateIP('fd00::1')).toBe(true);
                expect(isPrivateIP('[fc00::1]')).toBe(true);
            });

            it('should detect fe80::/10 (IPv6 link-local)', () => {
                expect(isPrivateIP('fe80::1')).toBe(true);
                expect(isPrivateIP('[fe80::1]')).toBe(true);
            });

            it('should detect AWS IPv6 metadata endpoint', () => {
                expect(METADATA_IPS.includes('fd00:ec2::254')).toBe(true);
            });
        });

        describe('IPv4 - Public IPs', () => {
            it('should allow public IP addresses', () => {
                expect(isPrivateIP('8.8.8.8')).toBe(false); // Google DNS
                expect(isPrivateIP('1.1.1.1')).toBe(false); // Cloudflare DNS
                expect(isPrivateIP('93.184.216.34')).toBe(false); // Example.com
                expect(isPrivateIP('151.101.1.140')).toBe(false); // GitHub
            });
        });

        describe('Edge Cases', () => {
            it('should handle invalid input', () => {
                expect(isPrivateIP('')).toBe(true);
                expect(isPrivateIP(null)).toBe(true);
                expect(isPrivateIP(undefined)).toBe(true);
            });
        });
    });

    describe('isDangerousHost', () => {
        describe('Localhost Variations', () => {
            it('should detect localhost', () => {
                expect(isDangerousHost('localhost')).toBe(true);
                expect(isDangerousHost('LOCALHOST')).toBe(true);
                expect(isDangerousHost('LocalHost')).toBe(true);
            });

            it('should detect localhost variations', () => {
                expect(isDangerousHost('localhost.localdomain')).toBe(true);
                expect(isDangerousHost('test.localhost')).toBe(true);
                expect(isDangerousHost('api.localhost')).toBe(true);
            });

            it('should detect IPv6 localhost names', () => {
                expect(isDangerousHost('ip6-localhost')).toBe(true);
                expect(isDangerousHost('ip6-loopback')).toBe(true);
            });
        });

        describe('IP Addresses', () => {
            it('should detect private IPs in hostname', () => {
                expect(isDangerousHost('127.0.0.1')).toBe(true);
                expect(isDangerousHost('192.168.1.1')).toBe(true);
                expect(isDangerousHost('10.0.0.1')).toBe(true);
            });

            it('should detect encoded localhost', () => {
                expect(isDangerousHost('0x7f000001')).toBe(true); // Hex
                expect(isDangerousHost('2130706433')).toBe(true); // Decimal
                expect(isDangerousHost('0177.0000.0000.0001')).toBe(true); // Octal
            });

            it('should detect special addresses', () => {
                expect(isDangerousHost('0.0.0.0')).toBe(true);
                expect(isDangerousHost('broadcasthost')).toBe(true);
            });
        });

        describe('Internal TLDs', () => {
            it('should detect .local domains', () => {
                expect(isDangerousHost('server.local')).toBe(true);
                expect(isDangerousHost('api.local')).toBe(true);
            });

            it('should detect .internal domains', () => {
                expect(isDangerousHost('api.internal')).toBe(true);
                expect(isDangerousHost('service.internal')).toBe(true);
            });

            it('should detect other internal TLDs', () => {
                expect(isDangerousHost('server.private')).toBe(true);
                expect(isDangerousHost('api.corp')).toBe(true);
                expect(isDangerousHost('dev.home')).toBe(true);
                expect(isDangerousHost('router.lan')).toBe(true);
            });
        });

        describe('Public Domains', () => {
            it('should allow public domains', () => {
                expect(isDangerousHost('example.com')).toBe(false);
                expect(isDangerousHost('api.example.com')).toBe(false);
                expect(isDangerousHost('webhook.myapp.io')).toBe(false);
                expect(isDangerousHost('hooks.slack.com')).toBe(false);
            });
        });

        describe('Edge Cases', () => {
            it('should handle invalid input', () => {
                expect(isDangerousHost('')).toBe(true);
                expect(isDangerousHost(null)).toBe(true);
                expect(isDangerousHost(undefined)).toBe(true);
            });
        });
    });

    describe('validateWebhookUrlSync', () => {
        describe('Valid URLs', () => {
            it('should accept valid HTTPS URLs', () => {
                const result = validateWebhookUrlSync('https://example.com/webhook');
                expect(result.valid).toBe(true);
            });

            it('should accept HTTPS URLs with paths and query params', () => {
                const result = validateWebhookUrlSync('https://api.example.com/webhooks/receive?token=abc123');
                expect(result.valid).toBe(true);
            });

            it('should accept HTTP in non-production', () => {
                const originalEnv = process.env.NODE_ENV;
                process.env.NODE_ENV = 'development';

                const result = validateWebhookUrlSync('http://example.com/webhook');
                expect(result.valid).toBe(true);

                process.env.NODE_ENV = originalEnv;
            });
        });

        describe('Invalid Protocol', () => {
            it('should reject non-HTTP(S) protocols', () => {
                expect(validateWebhookUrlSync('ftp://example.com').valid).toBe(false);
                expect(validateWebhookUrlSync('file:///etc/passwd').valid).toBe(false);
                expect(validateWebhookUrlSync('javascript:alert(1)').valid).toBe(false);
                expect(validateWebhookUrlSync('data:text/html,<script>alert(1)</script>').valid).toBe(false);
            });

            it('should reject HTTP in production', () => {
                const originalEnv = process.env.NODE_ENV;
                process.env.NODE_ENV = 'production';

                const result = validateWebhookUrlSync('http://example.com/webhook');
                expect(result.valid).toBe(false);
                expect(result.error).toContain('HTTPS');

                process.env.NODE_ENV = originalEnv;
            });
        });

        describe('Private/Internal URLs', () => {
            it('should reject localhost URLs', () => {
                const result = validateWebhookUrlSync('https://localhost/webhook');
                expect(result.valid).toBe(false);
                expect(result.error).toContain('not allowed');
            });

            it('should reject private IP URLs', () => {
                expect(validateWebhookUrlSync('https://127.0.0.1/webhook').valid).toBe(false);
                expect(validateWebhookUrlSync('https://192.168.1.1/webhook').valid).toBe(false);
                expect(validateWebhookUrlSync('https://10.0.0.1/webhook').valid).toBe(false);
                expect(validateWebhookUrlSync('https://172.16.0.1/webhook').valid).toBe(false);
            });

            it('should reject cloud metadata endpoints', () => {
                const result = validateWebhookUrlSync('https://169.254.169.254/latest/meta-data');
                expect(result.valid).toBe(false);
                expect(result.error).toContain('not allowed');
            });

            it('should reject internal domains', () => {
                expect(validateWebhookUrlSync('https://api.local/webhook').valid).toBe(false);
                expect(validateWebhookUrlSync('https://service.internal/webhook').valid).toBe(false);
                expect(validateWebhookUrlSync('https://app.corp/webhook').valid).toBe(false);
            });

            it('should reject IPv6 localhost', () => {
                expect(validateWebhookUrlSync('https://[::1]/webhook').valid).toBe(false);
                expect(validateWebhookUrlSync('https://[fc00::1]/webhook').valid).toBe(false);
            });
        });

        describe('URLs with Credentials', () => {
            it('should reject URLs with username', () => {
                const result = validateWebhookUrlSync('https://user@example.com/webhook');
                expect(result.valid).toBe(false);
                expect(result.error).toContain('username/password');
            });

            it('should reject URLs with username and password', () => {
                const result = validateWebhookUrlSync('https://user:pass@example.com/webhook');
                expect(result.valid).toBe(false);
                expect(result.error).toContain('username/password');
            });
        });

        describe('Malformed URLs', () => {
            it('should reject invalid URL format', () => {
                expect(validateWebhookUrlSync('not a url').valid).toBe(false);
                expect(validateWebhookUrlSync('htp://example.com').valid).toBe(false);
                expect(validateWebhookUrlSync('//example.com').valid).toBe(false);
            });

            it('should reject empty or null URLs', () => {
                expect(validateWebhookUrlSync('').valid).toBe(false);
                expect(validateWebhookUrlSync(null).valid).toBe(false);
                expect(validateWebhookUrlSync(undefined).valid).toBe(false);
            });

            it('should reject URLs without hostname', () => {
                const result = validateWebhookUrlSync('https:///webhook');
                expect(result.valid).toBe(false);
            });
        });
    });

    describe('validateWebhookUrl (async with DNS)', () => {
        describe('Valid Public URLs', () => {
            it('should validate and resolve valid public domain', async () => {
                const result = await validateWebhookUrl('https://example.com/webhook', {
                    resolveDNS: true
                });

                expect(result.valid).toBe(true);
                expect(result.hostname).toBe('example.com');
                expect(result.protocol).toBe('https:');
                expect(result.ips).toBeDefined();
                expect(result.ips.length).toBeGreaterThan(0);
            }, 10000); // Increase timeout for DNS resolution

            it('should accept URL without DNS resolution when disabled', async () => {
                const result = await validateWebhookUrl('https://example.com/webhook', {
                    resolveDNS: false
                });

                expect(result.valid).toBe(true);
                expect(result.hostname).toBe('example.com');
                expect(result.ips).toEqual([]);
            });
        });

        describe('DNS Resolution Failures', () => {
            it('should reject non-existent domains', async () => {
                await expect(
                    validateWebhookUrl('https://this-domain-definitely-does-not-exist-12345.com/webhook', {
                        resolveDNS: true
                    })
                ).rejects.toThrow('DNS resolution failed');
            }, 10000);

            it('should reject invalid hostnames that fail DNS lookup', async () => {
                await expect(
                    validateWebhookUrl('https://invalid..domain.com/webhook', {
                        resolveDNS: true
                    })
                ).rejects.toThrow();
            }, 10000);
        });

        describe('DNS Rebinding Protection', () => {
            it('should validate URL passes sync checks before DNS resolution', async () => {
                // This tests that we do basic validation before expensive DNS lookup
                await expect(
                    validateWebhookUrl('https://localhost/webhook', { resolveDNS: true })
                ).rejects.toThrow('not allowed');
            });
        });
    });

    describe('resolveAndValidateHostname', () => {
        it('should resolve valid public hostname to IPs', async () => {
            const ips = await resolveAndValidateHostname('example.com');
            expect(ips).toBeDefined();
            expect(Array.isArray(ips)).toBe(true);
            expect(ips.length).toBeGreaterThan(0);
        }, 10000);

        it('should reject if hostname resolves to private IP', async () => {
            // Note: This test assumes localhost resolves to 127.0.0.1
            // In some environments it might fail, so we catch and verify error message
            try {
                await resolveAndValidateHostname('localhost');
                fail('Should have thrown error for localhost');
            } catch (error) {
                expect(error.message).toMatch(/private|reserved|DNS resolution failed/i);
            }
        }, 10000);

        it('should reject non-existent hostname', async () => {
            await expect(
                resolveAndValidateHostname('this-hostname-does-not-exist-xyz123.com')
            ).rejects.toThrow('DNS resolution failed');
        }, 10000);
    });

    describe('Integration Tests', () => {
        describe('Common Attack Vectors', () => {
            it('should block AWS metadata endpoint variations', async () => {
                const urls = [
                    'http://169.254.169.254/latest/meta-data/',
                    'http://169.254.169.254/latest/user-data/',
                    'http://[fd00:ec2::254]/latest/meta-data/'
                ];

                for (const url of urls) {
                    const result = validateWebhookUrlSync(url);
                    expect(result.valid).toBe(false);
                }
            });

            it('should block various localhost representations', () => {
                const urls = [
                    'https://localhost/webhook',
                    'https://127.0.0.1/webhook',
                    'https://127.1/webhook',
                    'https://[::1]/webhook',
                    'https://0.0.0.0/webhook',
                    'https://api.localhost/webhook'
                ];

                for (const url of urls) {
                    const result = validateWebhookUrlSync(url);
                    expect(result.valid).toBe(false);
                }
            });

            it('should block internal network ranges', () => {
                const urls = [
                    'https://192.168.1.100/webhook',
                    'https://10.0.0.1/webhook',
                    'https://172.16.0.1/webhook',
                    'https://172.31.255.255/webhook'
                ];

                for (const url of urls) {
                    const result = validateWebhookUrlSync(url);
                    expect(result.valid).toBe(false);
                }
            });

            it('should allow legitimate webhook services', () => {
                const urls = [
                    'https://hooks.slack.com/services/xxx',
                    'https://discord.com/api/webhooks/xxx',
                    'https://api.example.com/webhooks/receive',
                    'https://webhook.site/unique-id'
                ];

                for (const url of urls) {
                    const result = validateWebhookUrlSync(url);
                    expect(result.valid).toBe(true);
                }
            });
        });
    });
});
