[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$baseDir = Split-Path -Parent $MyInvocation.MyCommand.Path

$replacements = [ordered]@{
    '#FF7043' = '#5B8DEF'
    '#F4511E' = '#4A7AD9'
    '#FF8A65' = '#7BA8F0'
    '#FF6B35' = '#5B8DEF'
    '#E64A19' = '#3A6BC4'
    '#E65100' = '#3A6BC4'
    '#BF360C' = '#3A6BC4'
    '#FFE0B2' = '#D0E0F5'
    '#FFCC80' = '#B5D0EC'
    '#FFCCBC' = '#E0ECF7'
    '#FFCDD2' = '#E8F0FA'
    '#FFAB91' = '#A5C3EA'
    '#FFF3E0' = '#EEF4FC'
    '#FFF5EE' = '#F5F8FC'
    '#FFFBF7' = '#F8FAFE'
    '#FFE8DC' = '#EAF1FA'
    '#FFF8F4' = '#F2F6FC'
    '#FFF8E1' = '#E6EEF9'
    '#FFECB3' = '#D8E6F5'
    '#FFE082' = '#C5DAF0'
    '#3E2723' = '#2C3E5A'
    '#5D4037' = '#4A5568'
    '#8D6E63' = '#7A8BA0'
    '#A1887F' = '#9FAFBE'
    '#BCAAA4' = '#B5C3D4'
    '#D7CCC8' = '#CDD5E0'
    '#EFEBE9' = '#E8ECF2'
    '#FBE9E7' = '#EBF0F8'
    '#FF8C42' = '#6B9BCE'
}

$fileNames = @(
    'app.wxss',
    'pages\address\address.wxss',
    'pages\agent\agent.wxss',
    'pages\assist\assist.wxss',
    'pages\assist-manage\assist-manage.wxss',
    'pages\bind-assist\bind-assist.wxss',
    'pages\child\child.wxss',
    'pages\child-plan\child-plan.wxss',
    'pages\child-trips\child-trips.wxss',
    'pages\index\index.wxss',
    'pages\login\login.wxss',
    'pages\map-trip\map-trip.wxss',
    'pages\medals\medals.wxss',
    'pages\order-detail\order-detail.wxss',
    'pages\orders\orders.wxss',
    'pages\passenger\passenger.wxss',
    'pages\profile\profile.wxss',
    'pages\sos\sos.wxss',
    'pages\step-confirm\step-confirm.wxss',
    'pages\taxi\taxi.wxss',
    'pages\taxi-detail\taxi-detail.wxss',
    'pages\ticket\ticket.wxss',
    'pages\ticket-detail\ticket-detail.wxss',
    'pages\trip-monitor\trip-monitor.wxss',
    'pages\volunteer\volunteer.wxss',
    'components\float-island\float-island.wxss',
    'components\custom-tabbar\custom-tabbar.wxss'
)

foreach ($name in $fileNames) {
    $filePath = Join-Path $baseDir $name
    if (Test-Path $filePath) {
        $content = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)
        $originalContent = $content
        
        foreach ($old in $replacements.Keys) {
            $new = $replacements[$old]
            $content = $content.Replace($old, $new)
            $content = $content.Replace($old.ToLower(), $new)
        }
        
        if ($content -ne $originalContent) {
            [System.IO.File]::WriteAllText($filePath, $content, [System.Text.Encoding]::UTF8)
            Write-Host "Updated: $name"
        } else {
            Write-Host "No changes: $name"
        }
    } else {
        Write-Host "Not found: $name"
    }
}

Write-Host ""
Write-Host "Done! All files processed."