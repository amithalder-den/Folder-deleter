/**
 * This file shows how to delete a folder from a GitHub repository using the REST v3 API
 * Dependencies: npm install axios && npm install dotenv` in the same
 * This script is supposed to run like this "node deleteFolder.js organization_account_name repository_name
 * It assumes there is a valid GitHub personal access token available as environment variable: GITHUB_TOKEN, BRANCH_NAME, FOLDER_TO_DELETE
 */

const axios = require('axios');
const  dotenv = require('dotenv') // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
dotenv.config()

const { GITHUB_TOKEN, BRANCH_NAME, FOLDER_TO_DELETE } = process.env; // Generate yours: https://github.com/settings/tokens/new (must have repo scope)
const [ REPOSITORY_OWNER, REPOSITORY_NAME ] = process.argv.slice(2);
//const { BRANCH_NAME } = process.env;

const TYPE = { BLOB: 'blob', TREE: 'tree' };

//const { FOLDER_TO_DELETE } = process.env;
//'brigade-test';

// See: https://docs.github.com/en/free-pro-team@latest/rest/reference/git#commits
const COMMITS_URL = `https://api.github.com/repos/${REPOSITORY_OWNER}/${REPOSITORY_NAME}/git/commits`;

// See: https://docs.github.com/en/free-pro-team@latest/rest/reference/git#trees
const REPOSITORY_TREES_URL = `https://api.github.com/repos/${REPOSITORY_OWNER}/${REPOSITORY_NAME}/git/trees`;

// See: https://docs.github.com/en/free-pro-team@latest/rest/reference/git#get-a-reference
const REF_URL = `https://api.github.com/repos/${REPOSITORY_OWNER}/${REPOSITORY_NAME}/git/refs/heads/${BRANCH_NAME}`;
console.log('token - ',GITHUB_TOKEN)
const headers = {
  Accept: 'application/vnd.github.v3+json',
 Authorization: `Bearer ${GITHUB_TOKEN}`,
};

const main = async () => {
  console.log('ref-url 1- ',REF_URL)
  // Get the sha of the last commit on BRANCH_NAME
  const { data: { object: { sha: currentCommitSha } } } = await axios({ url: REF_URL, headers });

  console.log('commit-url 1- ',COMMITS_URL)
  // Get the sha of the root tree on the commit retrieved previously
  const COMMIT_URL = `${COMMITS_URL}/${currentCommitSha}`;
  const { data: { tree: { sha: treeSha } } } = await axios({ url: COMMIT_URL, headers });

  console.log('ref-url - ',`${REPOSITORY_TREES_URL}/${BRANCH_NAME}:${FOLDER_TO_DELETE}`)
  // Get the tree corresponding to the folder that must be deleted.
  // Uses the recursive query parameter to retrieve all files whatever the depth.
  // The result might come back truncated if the number of hits is big.
  // This truncated output case is NOT handled.
  const { data: { tree: oldTree } } = await axios({
    url: `${REPOSITORY_TREES_URL}/${BRANCH_NAME}:${FOLDER_TO_DELETE}`,
    headers,
    params: { recursive: true },
  });

  // Create a tree to edit the content of the repository, basically select all files
  // in the previous tree and mark them with sha=null to delete them.
  // The folder only exists in git if it has a file in its offspring.
  const newTree = oldTree
    .filter(({ type }) => type === TYPE.BLOB)
    .map(({ path, mode, type }) => (
      { path: `${FOLDER_TO_DELETE}/${path}`, sha: null, mode, type } // If sha is null => the file gets deleted
    ));
    console.log('Repo-url - ',REPOSITORY_TREES_URL)

  // Create a new tree with the file offspring of the target folder removed
  const { data: { sha: newTreeSha } } = await axios({
    url: REPOSITORY_TREES_URL,
    method: 'POST',
    headers,
    data: {
      base_tree: treeSha,
      tree: newTree,
    },
  });
  console.log('commit-url - ',COMMITS_URL)

  // Create a commit that uses the tree created above
  const { data: { sha: newCommitSha } } = await axios({
    url: COMMITS_URL,
    method: 'POST',
    headers,
    data: {
      message: 'Committing with GitHub\'s API :fire:',
      tree: newTreeSha,
      parents: [ currentCommitSha ],
    },
  });

  console.log('ref-url - ',REF_URL)

  // Make BRANCH_NAME point to the created commit
  await axios({
    url: REF_URL,
    method: 'POST',
    headers,
    data: { sha: newCommitSha },
  });
};


main()
  .catch((error) => console.log('error - ',error.response.data));
