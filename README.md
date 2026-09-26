# YouTube Age Filter for Tampermonkey

A Tampermonkey userscript that filters YouTube videos by visible upload age.

The script is controlled entirely from the Tampermonkey extension menu. There is no floating page menu, because YouTube's current layout and single-page-app behavior can make injected page menus unreliable.

## Features

- Filter YouTube videos by maximum visible age:
  - 1 month
  - 3 months
  - 6 months
  - 1 year
- Enable or disable the filter from the Tampermonkey extension menu.
- Optionally hide videos where YouTube does not expose a visible upload date.
- Supports English and Portuguese YouTube date labels.
- Reapplies automatically as YouTube dynamically loads more videos.
- Works across normal YouTube navigation without needing a full page reload.

## Supported date labels

The script detects labels such as:

```text
3 days ago
2 weeks ago
5 months ago
1 year ago
Streamed 2 days ago
ha 3 dias
ha 2 semanas
ha 5 meses
ha 1 ano
há 3 dias
há 2 semanas
há 5 meses
há 1 ano
3 dias atrás
```

It also understands YouTube's compact labels:

```text
8h ago
30m ago
3d ago
2w ago
2 wk ago
3mo ago
1y ago
2 yr ago
```

In compact labels, `m` means minutes and `mo` means months.

When the same card shows more than one date-like text, such as a title that says "10 years ago", the script uses the video's upload date rather than the title.
