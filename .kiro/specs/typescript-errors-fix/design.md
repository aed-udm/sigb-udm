# Design Document

## Overview

This design addresses TypeScript compilation errors across multiple files by implementing targeted fixes for syntax issues, import problems, type mismatches, and missing type definitions. The solution follows a systematic approach to ensure all errors are resolved while maintaining code quality and functionality.

## Architecture

The fix strategy is organized into four main categories:

1. **Syntax Error Resolution**: Fix malformed JavaScript/TypeScript syntax
2. **Import Correction**: Resolve missing or incorrect imports
3. **Type System Alignment**: Ensure component props match their type definitions
4. **Service Type Enhancement**: Add proper typing for external dependencies

## Components and Interfaces

### 1. Syntax Error Fixes

**File**: `scripts/test-nextjs-mysql.js`
- **Issue**: Unterminated string literals and missing commas on line 107
- **Solution**: Properly escape backslashes in console.log statements and fix string termination
- **Impact**: Enables script execution without syntax errors

### 2. Import Resolution

**File**: `src/components/auth/AuthStatus.tsx`
- **Issue**: `Sync` icon is not exported by `lucide-react`
- **Solution**: Replace `Sync` with `RefreshCw` or `RotateCcw` which are valid lucide-react exports
- **Alternative**: Use `Loader2` with rotation animation for sync indication

### 3. Badge Component Type Alignment

**File**: `src/components/ui/badge.tsx` and `src/components/auth/AuthStatus.tsx`
- **Issue**: Missing `VariantProps` import causing BadgeProps interface to be incomplete
- **Root Cause**: Badge component uses `VariantProps<typeof badgeVariants>` but doesn't import it
- **Solution**: Add `import { type VariantProps } from "class-variance-authority"`
- **Impact**: Enables proper type checking for variant prop values

### 4. Active Directory Service Type Enhancement

**File**: `src/lib/services/active-directory.ts`
- **Issues**: 
  - Missing `Client` type from LDAP library
  - JWT signing options type mismatch
- **Solutions**:
  - Add proper LDAP client import and typing
  - Fix JWT signing options to match expected interface
  - Add proper type definitions for LDAP operations

## Data Models

### Badge Variant Types
```typescript
type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info"
```

### LDAP Client Interface
```typescript
interface LDAPClient {
  bind(dn: string, password: string): Promise<void>;
  search(baseDN: string, options: SearchOptions): Promise<SearchResult>;
  unbind(): Promise<void>;
}
```

### JWT Signing Options
```typescript
interface JWTSignOptions {
  expiresIn: string | number;
  issuer: string;
  algorithm?: string;
}
```

## Error Handling

### Syntax Error Prevention
- Implement proper string escaping patterns
- Add linting rules to catch syntax issues early
- Use template literals for complex string formatting

### Import Validation
- Verify all imports against actual exports
- Use TypeScript's module resolution for validation
- Implement import organization standards

### Type Safety Measures
- Ensure all component props have proper type definitions
- Use strict TypeScript configuration
- Implement runtime type checking where necessary

## Testing Strategy

### Syntax Validation
- Run TypeScript compiler to verify syntax correctness
- Execute scripts to ensure they run without errors
- Use ESLint to catch potential syntax issues

### Type Checking
- Compile project with strict TypeScript settings
- Verify component prop types match their interfaces
- Test import resolution across all modules

### Integration Testing
- Test Badge component with all variant values
- Verify Active Directory service operations
- Ensure authentication flow works with corrected types

### Validation Steps
1. Fix syntax errors and verify scripts execute
2. Correct imports and verify module resolution
3. Align component types and verify prop passing
4. Enhance service types and verify functionality
5. Run full TypeScript compilation to ensure no remaining errors