$certSubject = "CN=AURA Security Solutions"
$cert = Get-ChildItem Cert:\CurrentUser\My | Where-Object { $_.Subject -eq $certSubject } | Select-Object -First 1
if (-not $cert) {
    Write-Host "Generating new Self-Signed Code Signing Certificate..."
    $cert = New-SelfSignedCertificate -Type CodeSigningCert -Subject $certSubject -FriendlyName "AURA Code Signing" -CertStoreLocation "Cert:\CurrentUser\My"
}

Write-Host "Signing PersonalSOC.exe..."
Set-AuthenticodeSignature -FilePath "dist\PersonalSOC.exe" -Certificate $cert

Write-Host "Signing PersonalSOC_Setup.exe..."
Set-AuthenticodeSignature -FilePath "dist\PersonalSOC_Setup.exe" -Certificate $cert

Write-Host "Authenticode Signature applied successfully!"
