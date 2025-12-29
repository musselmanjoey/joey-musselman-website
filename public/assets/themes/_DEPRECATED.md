# Deprecated Files

The following files in this directory are **deprecated** and kept only for reference:

- `GENERATE.md` - Original V1 prompts (layered approach)
- `GENERATE-V2.md` - Unified background attempt
- `GENERATE-V3.md` - Arcade room prompts
- `GENERATE-V4.md` - Record store prompts
- `PROMPTS.md` - Comprehensive prompt reference

## New Location

All prompts have been consolidated into:

```
prompts/
├── _context/               # Reusable style anchors
│   ├── club-penguin-style.md
│   └── arcade-neon.md
└── default/                # Zone-specific prompts
    ├── lobby.md
    ├── arcade.md
    └── records.md
```

## Why the change?

1. **Organization** - One file per zone with all related info
2. **Maintainability** - Edit prompts in place, no more V5, V6, etc.
3. **Completeness** - Each zone file includes prompts + hitbox positions + notes
4. **Extensibility** - Easy to add `halloween/` or `christmas/` prompt variants

## Safe to delete

Once you're comfortable with the new structure, you can delete:
- `GENERATE.md`
- `GENERATE-V2.md`
- `GENERATE-V3.md`
- `GENERATE-V4.md`
- `PROMPTS.md`
- This file (`_DEPRECATED.md`)
