#!/bin/bash

# Ask user for output format
echo "Choose output format (md/pdf/docx): "
read -r FORMAT
FORMAT=$(echo "$FORMAT" | tr '[:upper:]' '[:lower:]')  # lowercase

if [[ "$FORMAT" != "md" && "$FORMAT" != "pdf" && "$FORMAT" != "docx" ]]; then
  echo "Invalid format. Please choose md, pdf, or docx."
  exit 1
fi

OUTPUT="codebase_dump.md"

# Clear output file
> "$OUTPUT"

# Add directory tree
echo "## Project Directory Structure" >> "$OUTPUT"
echo '```' >> "$OUTPUT"
tree -F --dirsfirst -I node_modules >> "$OUTPUT"
echo '```' >> "$OUTPUT"
echo -e "\n\n" >> "$OUTPUT"


# Ignore patterns
IGNORE_DIRS="node_modules|.git|dist|build|package-lock.json"

# File extensions to include
EXTENSIONS="js|py|css|html|json|sh|Dockerfile|md"

# Process files
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

echo "✅ Markdown file created: $OUTPUT"

# Convert if needed
if [[ "$FORMAT" == "pdf" || "$FORMAT" == "docx" ]]; then
  # Check if pandoc is installed
  if ! command -v pandoc &> /dev/null; then
    echo "Error: pandoc is not installed. Please install pandoc to convert to $FORMAT."
    exit 1
  fi

  OUTFILE="codebase_dump.$FORMAT"
  echo "Converting to $OUTFILE..."

  if [[ "$FORMAT" == "pdf" ]]; then
    pandoc "$OUTPUT" -o "$OUTFILE" --highlight-style=tango
  else
    pandoc "$OUTPUT" -o "$OUTFILE"
  fi

  echo "✅ File created: $OUTFILE"
fi
