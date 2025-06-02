#!/bin/bash

# Output file
OUTPUT="codebase_dump.md"
> "$OUTPUT"  # Clear the file if it exists

# Add directory tree to output
echo "## Project Directory Structure" >> "$OUTPUT"
tree -F --dirsfirst -I node_modules >> "$OUTPUT"
echo -e "\n\n" >> "$OUTPUT"

# Ignore patterns
IGNORE_DIRS="node_modules|.git|dist|build|package-lock.json"

# File extensions to include
EXTENSIONS="js|py|css|html|json|sh|Dockerfile|md"

# Find and process files
find . -type f \
  | grep -Ev "$IGNORE_DIRS" \
  | grep -E "\.($EXTENSIONS)$|Dockerfile$" \
  | sort \
  | while read -r file; do
    echo "### \`$file\`" >> "$OUTPUT"
    echo '```'$(basename "$file" | awk -F. '{print $NF}') >> "$OUTPUT"
    cat "$file" >> "$OUTPUT"
    echo -e '\n```\n' >> "$OUTPUT"
done

echo "✅ Codebase saved to $OUTPUT"
