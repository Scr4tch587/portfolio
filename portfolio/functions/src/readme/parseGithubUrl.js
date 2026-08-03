function parseGithubUrl(input) {
  if (!input || typeof input !== 'string') {
    throw new Error('GitHub URL is required.');
  }

  const trimmed = input.trim();
  const sshMatch = trimmed.match(/^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/i);
  if (sshMatch) {
    return {
      owner: sshMatch[1],
      repo: sshMatch[2],
      fullName: `${sshMatch[1]}/${sshMatch[2]}`.toLowerCase(),
    };
  }

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error('Unsupported GitHub URL format.');
  }

  if (parsed.hostname !== 'github.com') {
    throw new Error('Unsupported GitHub URL format.');
  }

  const parts = parsed.pathname.replace(/\.git$/, '').split('/').filter(Boolean);
  if (parts.length < 2) {
    throw new Error('Unsupported GitHub URL format.');
  }

  const [owner, repo] = parts;
  return {
    owner,
    repo,
    fullName: `${owner}/${repo}`.toLowerCase(),
  };
}

function encodeRepoKey(fullName) {
  return fullName.toLowerCase().replace(/\//g, '__');
}

module.exports = {
  parseGithubUrl,
  encodeRepoKey,
};
