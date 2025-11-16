#!/bin/bash
# Script to create new GitHub repository and push code

# Create new repository on GitHub
gh repo create brandframe-studio-v2 --public --description "AI-powered storyboard generation tool with frame count selection and narrative continuation"

# Add the new remote
git remote add origin-new https://github.com/$(gh api user --jq .login)/brandframe-studio-v2.git

# Push to new repository
git push -u origin-new main

echo "Repository created and code pushed successfully!"
echo "Repository URL: https://github.com/$(gh api user --jq .login)/brandframe-studio-v2"

