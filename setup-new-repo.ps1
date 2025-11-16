# PowerShell script to create new GitHub repository and push code

# Create new repository on GitHub
gh repo create brandframe-studio-v2 --public --description "AI-powered storyboard generation tool with frame count selection and narrative continuation"

# Get your GitHub username
$username = gh api user --jq .login

# Add the new remote
git remote add origin-new "https://github.com/$username/brandframe-studio-v2.git"

# Push to new repository
git push -u origin-new main

Write-Host "Repository created and code pushed successfully!"
Write-Host "Repository URL: https://github.com/$username/brandframe-studio-v2"

