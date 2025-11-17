#!/bin/bash
#
# Fix .replit configuration for publishing
# Problem: Replit only allows 1 external port for deployments
# Solution: Remove all extra port configurations, keep only port 5000 -> 80
#

set -e

REPLIT_FILE=".replit"
BACKUP_FILE=".replit.backup"
TEMP_FILE=".replit.tmp"

echo "🔧 Fixing .replit configuration for publishing..."
echo ""

# Check if .replit exists
if [ ! -f "$REPLIT_FILE" ]; then
    echo "❌ Error: .replit file not found"
    exit 1
fi

# Count current ports
PORTS_BEFORE=$(grep -c '^\[\[ports\]\]' "$REPLIT_FILE" || echo "0")
echo "📊 Current configuration: $PORTS_BEFORE port(s) configured"

if [ "$PORTS_BEFORE" -eq 1 ]; then
    echo "✅ Configuration already correct (only 1 port)"
    exit 0
fi

# Create backup
cp "$REPLIT_FILE" "$BACKUP_FILE"
echo "✓ Created backup: $BACKUP_FILE"

# Process file: keep everything until first [[ports]], then skip all other [[ports]] sections
awk '
BEGIN { 
    in_first_port = 0
    in_other_port = 0
    first_port_done = 0
}
/^\[\[ports\]\]/ {
    if (first_port_done == 0) {
        # First port section - keep it
        print
        in_first_port = 1
        next
    } else {
        # Other port sections - skip
        in_other_port = 1
        next
    }
}
/^\[/ {
    # New section starting
    if (in_first_port == 1) {
        first_port_done = 1
        in_first_port = 0
    }
    if (in_other_port == 1) {
        in_other_port = 0
    }
    print
    next
}
{
    # Regular line
    if (in_other_port == 0) {
        print
    }
}
' "$REPLIT_FILE" > "$TEMP_FILE"

# Replace original file
mv "$TEMP_FILE" "$REPLIT_FILE"

# Count new ports
PORTS_AFTER=$(grep -c '^\[\[ports\]\]' "$REPLIT_FILE" || echo "0")

echo "✓ Updated .replit file"
echo ""
echo "📊 Statistics:"
echo "   Ports before: $PORTS_BEFORE"
echo "   Ports after:  $PORTS_AFTER"
echo "   Removed:      $((PORTS_BEFORE - PORTS_AFTER)) extra ports"
echo ""
echo "✅ SUCCESS! Your .replit is now configured for publishing."
echo "   You can now click 'Publish' again."
echo ""
echo "💡 If something goes wrong, restore with:"
echo "   cp $BACKUP_FILE $REPLIT_FILE"
echo ""
