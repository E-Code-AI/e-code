#!/usr/bin/env python3
"""
Codemod script to migrate auth.spec.ts to TestSession factory pattern.
Transforms manual CSRF/cookie handling to session helper methods.
"""

import re
import sys
from pathlib import Path

def migrate_register_calls(content: str) -> str:
    """Transform client.post('/api/auth/register'...) to session.register(...)"""
    
    # Pattern 1: Simple register with inline CSRF token
    pattern1 = r'''await client\.post\(['"]/api/auth/register['"],\s*{\s*email:\s*(\w+),\s*password:\s*(\w+),\s*username:\s*(\w+)\s*},\s*{\s*headers:\s*{\s*['"]x-csrf-token['"]:(\s*csrfToken|[\s\S]*?\.data\.csrfToken)\s*}\s*}\)'''
    replacement1 = r'await session.register(\1, \2, \3)'
    content = re.sub(pattern1, replacement1, content, flags=re.MULTILINE)
    
    # Pattern 2: Register with CSRF fetch before
    pattern2 = r'''const csrfRes\d* = await client\.get\(['"]/api/auth/csrf-token['"]\);[\s\n]*await client\.post\(['"]/api/auth/register['"],\s*{\s*email:\s*(\w+),\s*password:\s*(\w+),\s*username:\s*(\w+)\s*},\s*{\s*headers:\s*{\s*['"]x-csrf-token['"]:[\s\S]*?csrfRes\d*\.data\.csrfToken\s*}\s*}\)'''
    replacement2 = r'await session.register(\1, \2, \3)'
    content = re.sub(pattern2, replacement2, content, flags=re.MULTILINE | re.DOTALL)
    
    return content

def migrate_login_calls(content: str) -> str:
    """Transform client.post('/api/auth/login'...) to session.login(...)"""
    
    # Pattern: Login with CSRF fetch (preserves response variable if exists)
    pattern = r'''(\w+\s*=\s*)?const csrfRes\d* = await client\.get\(['"]/api/auth/csrf-token['"]\);[\s\n]*(const (\w+) = )?await client\.post\(['"]/api/auth/login['"],\s*{\s*email:\s*(\w+),\s*password:\s*(\w+)\s*},\s*{\s*headers:\s*{\s*['"]x-csrf-token['"]:[\s\S]*?csrfRes\d*\.data\.csrfToken\s*}\s*}\)'''
    
    def replacement(match):
        response_var = match.group(3)
        email = match.group(4)
        password = match.group(5)
        if response_var:
            return f'const {response_var} = await session.login({email}, {password})'
        else:
            return f'await session.login({email}, {password})'
    
    content = re.sub(pattern, replacement, content, flags=re.MULTILINE | re.DOTALL)
    
    return content

def migrate_logout_calls(content: str) -> str:
    """Transform logout calls to session.logout()"""
    
    pattern = r'''const csrfRes\d* = await client\.get\(['"]/api/auth/csrf-token['"],\s*{\s*headers:\s*{\s*Cookie:\s*authCookie\s*}\s*}\);[\s\n]*const (\w+) = await client\.post\(['"]/api/auth/logout['"],\s*{},\s*{\s*headers:\s*{\s*Cookie:[\s\S]*?['"]x-csrf-token['"]:[\s\S]*?}\s*}\)'''
    replacement = r'const \1 = await session.logout()'
    content = re.sub(pattern, replacement, content, flags=re.MULTILINE | re.DOTALL)
    
    return content

def migrate_get_user_calls(content: str) -> str:
    """Transform user retrieval calls"""
    
    pattern = r'''const (\w+) = await client\.get\(['"]/api/auth/user['"],\s*{\s*headers:\s*{\s*Cookie:\s*authCookie\s*}\s*}\)'''
    replacement = r'const \1 = await session.getUser()'
    content = re.sub(pattern, replacement, content)
    
    return content

def migrate_session_management_beforeeach(content: str) -> str:
    """Transform Session Management describe block beforeEach"""
    
    # Find Session Management beforeEach block and replace with createAuthenticatedSession
    pattern = r'''(describe\(['"]Session Management['"],\s*\(\) => \{[\s\S]*?)beforeEach\(async \(\) => \{[\s\S]*?// Register and login[\s\S]*?authCookie = loginRes\.headers\[['"]set-cookie['"]\]\?\.\[0\] \|\| ['"];[\s\S]*?\}\);'''
    
    replacement = r'''\1beforeEach(async () => {
      session = await createAuthenticatedSession(baseClient, testEmail, testPassword, testUsername);
    });'''
    
    content = re.sub(pattern, replacement, content, flags=re.MULTILINE | re.DOTALL)
    
    return content

def migrate_admin_beforeeach(content: str) -> str:
    """Transform Admin Access Control tests to use createAdminSession"""
    
    # For admin login test - just use loginUser
    pattern1 = r'''(it\(['"]should allow admin login with correct credentials['"],\s*async \(\) => \{[\s\n]*)const response = await loginUser\(client, ADMIN_EMAIL, ADMIN_PASSWORD\);'''
    replacement1 = r'''\1const adminSession = createTestSession(baseClient);
      const response = await adminSession.login(ADMIN_EMAIL, ADMIN_PASSWORD);'''
    content = re.sub(pattern1, replacement1, content, flags=re.MULTILINE | re.DOTALL)
    
    # For admin access endpoint test
    pattern2 = r'''(it\(['"]should grant admin access to admin-only endpoints['"],\s*async \(\) => \{[\s\n]*// Login as admin[\s\n]*)const loginRes = await loginUser\(client, ADMIN_EMAIL, ADMIN_PASSWORD\);[\s\n]*const adminCookie = loginRes\.headers\[['"]set-cookie['"]\]\?\.\[0\] \|\| [''];[\s\n]*// Try to access admin endpoint[\s\n]*const response = await client\.get\(['"]/api/admin/stats['"],\s*{\s*headers:\s*{\s*Cookie:\s*adminCookie\s*}\s*}\);'''
    replacement2 = r'''\1const adminSession = await createAdminSession(baseClient);
      const response = await adminSession.client.get('/api/admin/stats', {
        headers: { Cookie: adminSession.getCookie() }
      });'''
    content = re.sub(pattern2, replacement2, content, flags=re.MULTILINE | re.DOTALL)
    
    return content

def migrate_user_login_beforeeach(content: str) -> str:
    """Update User Login describe beforeEach to use session.register"""
    
    pattern = r'''(describe\(['"]User Login['"],\s*\(\) => \{[\s\n]*)beforeEach\(async \(\) => \{[\s\S]*?// CSRF token already obtained[\s\S]*?// Register a user first[\s\S]*?await client\.post\(['"]/api/auth/register['"],[\s\S]*?\}\);'''
    
    replacement = r'''\1beforeEach(async () => {
      // Register a user first
      await session.register(testEmail, testPassword, testUsername);
    });'''
    
    content = re.sub(pattern, replacement, content, flags=re.MULTILINE | re.DOTALL)
    
    return content

def cleanup_unused_variables(content: str) -> str:
    """Remove unused variables like authCookie, csrfToken declarations"""
    
    # Remove csrfToken and authCookie from global variables
    content = re.sub(r'\n\s*let csrfToken: string;', '', content)
    content = re.sub(r'\n\s*let authCookie: string;', '', content)
    
    return content

def main():
    # Get file path
    file_path = Path(__file__).parent.parent / 'backend' / 'auth.spec.ts'
    
    if not file_path.exists():
        print(f"Error: {file_path} not found")
        sys.exit(1)
    
    # Read original content
    original_content = file_path.read_text()
    
    # Apply migrations in order
    content = original_content
    print("Migrating register calls...")
    content = migrate_register_calls(content)
    
    print("Migrating login calls...")
    content = migrate_login_calls(content)
    
    print("Migrating logout calls...")
    content = migrate_logout_calls(content)
    
    print("Migrating getUser calls...")
    content = migrate_get_user_calls(content)
    
    print("Migrating User Login beforeEach...")
    content = migrate_user_login_beforeeach(content)
    
    print("Migrating Session Management beforeEach...")
    content = migrate_session_management_beforeeach(content)
    
    print("Migrating Admin tests...")
    content = migrate_admin_beforeeach(content)
    
    print("Cleaning up unused variables...")
    content = cleanup_unused_variables(content)
    
    # Write output
    output_path = file_path.with_suffix('.ts.migrated')
    output_path.write_text(content)
    
    print(f"\n✓ Migration complete!")
    print(f"Original: {file_path}")
    print(f"Migrated: {output_path}")
    print(f"\nReview the diff:")
    print(f"  diff -u {file_path} {output_path}")
    print(f"\nIf satisfied, apply changes:")
    print(f"  mv {output_path} {file_path}")

if __name__ == '__main__':
    main()
