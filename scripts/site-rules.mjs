// npm run site-rules -- <адрес> — правила сайта до автоматического доступа (шаг 556-1): robots.txt и где читать условия.
// Команда главного агента (package.json ядра, шаг 610); та же логика отвечает дверью `/api/node/site-rules` элементам.
// Код выхода: 0 — robots.txt не запрещает · 2 — запрещает · 3 — неизвестно (считать закрытым) · 1 — адрес не годится.
import { siteRules, siteRulesText } from '../lib/site-rules.mjs'

const target = process.argv[2]
if (!target) {
  console.log('usage: npm run site-rules -- <https://site/path>')
  process.exit(1)
}
const result = await siteRules(target)
for (const line of siteRulesText(result)) console.log(line)
process.exit(!result.ok ? 1 : result.robots.verdict === 'allowed' ? 0 : result.robots.verdict === 'disallowed' ? 2 : 3)
