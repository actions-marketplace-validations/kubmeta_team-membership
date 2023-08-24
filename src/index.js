import { getInput, setOutput, setFailed } from '@actions/core'
import { getOctokit, context } from '@actions/github'

run()

async function run() {

    try {

        const api = getOctokit(getInput("GITHUB_TOKEN", { required: true }), {})

        const organization = getInput("organization") || context.repo.owner
        const username = getInput("username")
        const team = getInput("team")

        console.log(`Getting teams for ${username} in org ${organization}. Will check if belongs to ${team}`)

        const query = `query($cursor: String, $org: String!, $userLogins: [String!], $username: String!)  {
            user(login: $username) {
                id
            }
            organization(login: $org) {
              teams (first:100, userLogins: $userLogins, after: $cursor) {
                  nodes {
                    name
                }
                pageInfo {
                  hasNextPage
                  endCursor
                }
              }
            }
        }`

        let data
        let teams = []
        let cursor = null

        // We need to check if the user exists, because if it doesn't exist then all teams in the org
        // are returned. If user doesn't exist graphql will throw an exception
        // Paginate
        do {
            data = await api.graphql(query, {
                "cursor": cursor,
                "org": organization,
                "userLogins": [username],
                "username": username
            })

            teams = teams.concat(data.organization.teams.nodes.map((val) => {
                return val.name
            }))

            cursor = data.organization.teams.pageInfo.endCursor
        } while (data.organization.teams.pageInfo.hasNextPage)

        let isTeamMember = teams.some((teamName) => {
            return team.toLowerCase() === teamName.toLowerCase()
        })

        console.log(`teams: [${teams.join(', ')}] for ${username} in org ${organization}`)
        console.log(`Belongs to ${team}?: ${isTeamMember}`)

        setOutput("teams", teams)
        setOutput("isTeamMember", isTeamMember)

    } catch (error) {
        console.log(error)
        setFailed(error.message)
    }
}