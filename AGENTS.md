# Project workflow

- Keep development and previews separate from the live website. Deploy changes to the live website only when the user instructs you to do so.
- When the user requests deployment and a commit, rebuild the frontend if it changed, restart the website, verify that it serves the updated version, then commit and push to the current branch’s GitHub upstream.
- When the user asks for a commit, commit directly using Conventional Commits. A commit request alone does not authorize a production deployment.

## Coding guidelines

- Write short, clear comments to explain why a decision was made or which constraint the code must satisfy.
- Aim for high cohesion. Give each module a clear responsibility and keep logic that changes together in the same place.
- Keep coupling low. Share small, explicit interfaces between modules so each can change independently.
