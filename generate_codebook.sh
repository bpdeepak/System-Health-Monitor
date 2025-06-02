#!/bin/bash

# Output file
OUTPUT="codebase_dump.md"
> "$OUTPUT"  # Clear the file if it exists

# Ignore patterns (edit this as needed)
IGNORE_DIRS="node_modules|.git|dist|build"

# File extensions to include (you can add more)
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
