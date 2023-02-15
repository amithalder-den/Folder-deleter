#!/bin/bash
##########Installing the GITHUB CLI######################
echo "Checking.................... GITHUB CLI on system"
if [ ! -x /usr/bin/gh ];
    then
        echo "GITHUB CLI will be INSTALLED now"
        type -p curl >/dev/null || sudo apt install curl -y
        curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg \
        && sudo chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg \
        && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
        && sudo apt update \
        && sudo apt install gh -y
    else
        echo -----------------------------------------------------------------------------
        echo "GITHUB CLI is already INSTALLED"
        echo -----------------------------------------------------------------------------
fi
read -p "Enter the GITHUB TOKEN (If looged in already, press ENTER):  " GITHUBTOKEN
rm -rf token.txt
touch token.txt
echo "$GITHUBTOKEN" > token.txt
echo 'GITHUB_TOKEN='"$GITHUBTOKEN"'' > .env
echo "GETTING.... Logged into GITHUB CLI"
gh auth --with-token < token.txt
echo "GETTING...... Organization list for GITHUB"
gh api -H "Accept: application/vnd.github+json" /user/orgs --jq ".[].login" > organization_list.out
echo "THE ORGANIZATION LIST is saved in organization_list.out"
cat > repolist.sh << EOF
#!/bin/bash
while IFS= read -r line; do
   gh repo list \$line -L 500 >> repolist.raw
done < \$1
EOF
chmod +x repolist.sh
touch repolist.raw
echo "GETTING...... Repo lists from GITHUB"
sh repolist.sh organization_list.out
sed 's/\s.*$//' repolist.raw > repo_list.out
echo "THE REPO LIST is saved in repo_list.out"
rm -rf repolist.raw && rm -rf repolist.sh
echo "STORING..... The repo list is stored in repo_list.out"
echo "CHECKING..... The Required Folder inside Repos"
read -p "Enter the file or folder name to be searched inside repos:  " FANDF
echo 'FOLDER_TO_DELETE='"$FANDF"'' >> .env
read -p "Enter the branch name to be searched inside repos:  " BNAME
echo 'BRANCH_NAME='"$BNAME"'' >> .env
cat > folderlist.sh << EOF
#!/bin/bash
fandf=$FANDF
while IFS= read -r line; do
    gh api --silent -H "Accept: application/vnd.github+json" /repos/\$line/contents/\$fandf > /dev/null
    ec=\$?

    if [ \$ec -eq 0 ];
    then echo "\$line YES"
    else echo "\$line NO"
    fi;
done < \$1
EOF
chmod +x folderlist.sh
echo "WAIT FOR SCRIPT TO COMPLETE"
sh folderlist.sh repo_list.out > final_list.out
cat final_list.out |grep "YES" > yes.out && sed 's/\s.*$//' yes.out > final_yes.out
cat final_list.out |grep "NO" > no.out && sed 's/\s.*$//' no.out > final_no.out
echo "THE FOLDER LIST is saved in final_yes.out & final_no.out"
rm -rf folderlist.sh
cat final_yes.out | cut -f1 -d"/" > organization_account.txt
cat final_yes.out | cut -f2 -d"/" > organization_repo.txt
npm install axios && npm install dotenv
cat > folder-remover.sh << EOF
#!/bin/bash
fandf=$FANDF
while read L1 <&3 && read L2 <&4; do
    echo "This \$fandf is deleted from \$L1 \$L2 on \$(date)"
    node deleteFolder.js \$L1 \$L2
done 3<organization_account.txt 4<organization_repo.txt
EOF
chmod +x folder-remover.sh
sh folder-remover.sh organization_account.txt organization_repo.txt > folder-deletion-log-$(date).out

echo "##Important file paths###############"
echo "THE ORGANIZATION LIST is saved in organization_list.out"
echo "ALL REPO LIST is saved in repo_list.out"
echo "THE TO BE DELETED REPO LIST is saved in final_yes.out"
echo "THE NOT TO BE DELETED REPO LIST is saved in final_no.out"
echo "THE FINAL LOG is saved in folder-deletion-log-DATE.out"
