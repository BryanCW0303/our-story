# Run the Windows origin for the Cloudflare tunnel.
Set-Location -LiteralPath (Join-Path $PSScriptRoot 'backend')
# Allow multipart headers in addition to the 80 MiB image.
& .\.venv\Scripts\waitress-serve.exe --listen=127.0.0.1:8011 --trusted-proxy=127.0.0.1 --trusted-proxy-headers=x-forwarded-proto --max-request-body-size=89128960 config.wsgi:application
exit $LASTEXITCODE
