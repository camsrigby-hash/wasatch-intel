cd C:\Users\camsr\code\wasatch-intel
$out = "verify_d1_results.txt"
"D1 Verification Run" | Out-File $out -Encoding ascii
Get-Date | Out-File $out -Append -Encoding ascii

"`n=== Q1: county row counts ===" | Out-File $out -Append -Encoding ascii
npx wrangler d1 execute wasatch-intel-db --remote --command "SELECT county, COUNT(*) FROM parcel_records GROUP BY county ORDER BY county" 2>&1 | Tee-Object -FilePath $out -Append

"`n=== Q2: total row count ===" | Out-File $out -Append -Encoding ascii
npx wrangler d1 execute wasatch-intel-db --remote --command "SELECT COUNT(*) FROM parcel_records" 2>&1 | Tee-Object -FilePath $out -Append

"`n=== Q3: enrichment log ===" | Out-File $out -Append -Encoding ascii
npx wrangler d1 execute wasatch-intel-db --remote --command "SELECT source, status, COUNT(*) FROM parcel_enrichment_log WHERE source='ugrc_lir' GROUP BY source, status" 2>&1 | Tee-Object -FilePath $out -Append

"`n=== Q4: empty jurisdiction total ===" | Out-File $out -Append -Encoding ascii
npx wrangler d1 execute wasatch-intel-db --remote --command "SELECT COUNT(*) FROM parcel_records WHERE jurisdiction=''" 2>&1 | Tee-Object -FilePath $out -Append

"`n=== Q5: empty jurisdiction by county ===" | Out-File $out -Append -Encoding ascii
npx wrangler d1 execute wasatch-intel-db --remote --command "SELECT county, COUNT(*) FROM parcel_records WHERE jurisdiction='' GROUP BY county" 2>&1 | Tee-Object -FilePath $out -Append

Write-Host "`nDone. Results in $out"
