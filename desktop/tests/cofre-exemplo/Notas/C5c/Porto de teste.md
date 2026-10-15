---
tags: [cidade]
---
# Porto de teste

Uma cidade sintética para conferir Bases e consultas.

![[C5c.base#Habitantes]]

```dataview
TABLE pontos AS "Pontos"
FROM #c5c
WHERE vivo = true
SORT pontos DESC
```
