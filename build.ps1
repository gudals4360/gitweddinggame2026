$ErrorActionPreference = 'Stop'
$utf8 = New-Object System.Text.UTF8Encoding($false)
$lines = [IO.File]::ReadAllText("$PWD\letter.txt", $utf8) -split "`r?`n"
$paras = ($lines -join "`n").Trim() -split "`n\s*`n"
$to = $paras[0]
$sign = $paras[-1] -split "`n"
$body = $paras[1..($paras.Count-2)]
$html = ''
for ($i=0; $i -lt $body.Count; $i++) {
  $cls = ''
  if ($i -eq 0) { $cls = ' class="first"' }
  if ($body[$i] -like '그래서 오늘*') { $cls = ' class="ask"' }
  if ($body[$i] -like '부디 서두르지*') { $cls = ' class="feedback"' }
  $html += "    <p$cls>$($body[$i])</p>`n"
}
$tpl = [IO.File]::ReadAllText("$PWD\template.html", $utf8)
$tpl = $tpl.Replace('{{TO}}', $to).Replace('{{BODY}}', $html.TrimEnd()).Replace('{{SIGN1}}', $sign[0]).Replace('{{SIGN2}}', $sign[1])
[IO.File]::WriteAllText("$PWD\index.html", $tpl, $utf8)

$md = "# 💌 록산느에게`n`n> Git 협업 '구혼편지' 수정 게임 · Mission: 친구 도움을 받아 프로포즈 계획하기`n`n---`n`n"
$md += ($paras -join "`n`n").Replace("`n영원히", "`n영원히").Trim()
$md = $md.Replace("영원히 당신의 것인,`n크리스티앙", "영원히 당신의 것인,  `n크리스티앙")
$md += "`n`n---`n`n### 워크플로`n`n1. **main** : 크리스티앙이 초안 작성`n2. **cyrano/edit-letter** : 시라노가 브랜치에서 편지 첨삭`n3. **Pull Request & Review** : 편지를 함께 개선`n4. **Release** : 최종 편지 제출`n"
[IO.File]::WriteAllText("$PWD\README.md", $md, $utf8)
