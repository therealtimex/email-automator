# Setup Wizard - Keyboard Shortcuts Guide

## Overview
The Setup Wizard now supports full keyboard navigation, allowing users to complete the entire setup process without using a mouse.

## Quick Reference

| Key | Action | Available In |
|-----|--------|--------------|
| `Enter` | Submit form / Continue | All steps |
| `Escape` | Go back | Most form steps |
| `Tab` | Navigate between fields | All forms |
| `Shift+Tab` | Navigate backwards | All forms |

## Step-by-Step Shortcuts

### 1. Welcome Step
```
┌────────────────────────────────────┐
│  WELCOME TO AUTOMATOR FORGE        │
│  [Button auto-focused on load]     │
│                                    │
│  ⏎ Enter → Continue to next step  │
└────────────────────────────────────┘
```

### 2. Type Selection Step
```
┌────────────────────────────────────┐
│  CONNECTION MODE                   │
│                                    │
│  [ ] Quick Ignition (Managed)      │
│  [ ] Manual Sync                   │
│                                    │
│  Click or use arrow keys to select│
│  ⏎ Enter → Confirm selection      │
│  Esc → Go back to welcome          │
└────────────────────────────────────┘
```

### 3. Managed Token Step
```
┌────────────────────────────────────┐
│  FORGE TOKEN                       │
│                                    │
│  [Access Token Input] ← Auto-focused│
│  sbp_xxxxxxxxxxxxxxxx              │
│                                    │
│  ⏎ Enter → Fetch Organizations    │
│  Esc → Back to Type Selection      │
│  Tab → Navigate to Back button     │
└────────────────────────────────────┘
```

### 4. Organization Selection Step
```
┌────────────────────────────────────┐
│  PROJECT CONFIG                    │
│                                    │
│  [Project Name] ← Auto-focused     │
│  Tab → [Region Dropdown]           │
│  Tab → [Organization List]         │
│                                    │
│  ⏎ Enter → Initialize System      │
│  Esc → Back to Token Input         │
└────────────────────────────────────┘
```

### 5. Manual Credentials Step
```
┌────────────────────────────────────┐
│  MANUAL SYNC                       │
│                                    │
│  [Platform URL] ← Auto-focused     │
│  https://xyz.supabase.co           │
│  Tab → [Anon Key Input]            │
│  eyJ...                            │
│                                    │
│  ⏎ Enter → Engage/Save            │
│  Esc → Back to Type Selection      │
└────────────────────────────────────┘
```

### 6. Migration Step
```
┌────────────────────────────────────┐
│  INSTALLATION                      │
│                                    │
│  [Token Input] ← Auto-focused      │
│  (Only shown if needed)            │
│                                    │
│  ⏎ Enter → Run Migration          │
│  (No Escape - migration is final)  │
└────────────────────────────────────┘
```

## Validation Rules

### Form Submission (Enter Key)
The Enter key **only works when**:
- ✅ All required fields are filled
- ✅ All fields pass validation
- ✅ No loading operation in progress
- ✅ Form is not disabled

### Examples
```typescript
// ✅ WORKS: Valid token
Token: "sbp_1234567890abcdef"
Press Enter → Fetches organizations

// ❌ BLOCKED: Invalid token
Token: "invalid_token"
Press Enter → Nothing happens

// ❌ BLOCKED: Empty field
Token: ""
Press Enter → Nothing happens

// ❌ BLOCKED: Loading state
Token: "sbp_valid_token" (loading...)
Press Enter → Nothing happens
```

## Accessibility Features

### Screen Reader Support
- All inputs have proper `aria-describedby` labels
- Error states use `aria-invalid`
- Loading states announced automatically
- Focus management follows WCAG guidelines

### Focus Indicators
- Clear visual focus rings on all interactive elements
- Focus preserved when validation fails
- Focus moved to error messages when shown

### Keyboard-Only Navigation
- No mouse required for entire wizard
- All actions accessible via keyboard
- Logical tab order through all elements

## Browser Compatibility

| Browser | Enter | Escape | Tab | Auto-focus |
|---------|-------|--------|-----|------------|
| Chrome  | ✅    | ✅     | ✅  | ✅         |
| Firefox | ✅    | ✅     | ✅  | ✅         |
| Safari  | ✅    | ✅     | ✅  | ✅         |
| Edge    | ✅    | ✅     | ✅  | ✅         |

## Tips for Power Users

1. **Speed Run Setup**
   ```
   Welcome → Enter
   Type → Click → Enter
   Token → Paste → Enter
   Org → Type name → Tab → Select region → Enter
   Done in ~10 seconds! ⚡
   ```

2. **Error Recovery**
   ```
   Validation error → Esc (go back)
   Fix input → Enter (try again)
   ```

3. **Multi-field Forms**
   ```
   Field 1 → Tab → Field 2 → Tab → Enter (submit)
   No need to click Submit button!
   ```

## Implementation Details

### Pattern Used
```typescript
const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && canSubmit) {
        e.preventDefault();
        onSubmit();
    } else if (e.key === 'Escape') {
        e.preventDefault();
        onBack();
    }
};

<div onKeyDown={handleKeyDown}>
    <Input autoFocus />
</div>
```

### Auto-focus Strategy
- First input in each step gets `autoFocus` attribute
- Focus applied when step mounts
- Conditional focus for optional fields
- Preserves accessibility

## Future Enhancements

### Planned
- [ ] Visual keyboard hints in UI
- [ ] Cmd/Ctrl+Enter to force submit
- [ ] Number keys for multi-choice steps
- [ ] Focus trap in modal

### Under Consideration
- [ ] Custom shortcut configuration
- [ ] Voice command integration
- [ ] Haptic feedback on mobile

## Troubleshooting

### Issue: Auto-focus not working
**Solution**: Check if browser has auto-focus disabled in settings

### Issue: Enter key does nothing
**Solution**: Verify form validation passes and fields are filled

### Issue: Focus lost after navigation
**Solution**: Each step re-focuses automatically on mount

### Issue: Tab order is wrong
**Solution**: Report to developers - tab order should be logical

## Related Documentation
- [Setup Wizard Architecture](./CLAUDE.md#setup-wizard)
- [Accessibility Guidelines](./ACCESSIBILITY.md)
- [Keyboard Navigation Best Practices](./KEYBOARD_NAVIGATION.md)
