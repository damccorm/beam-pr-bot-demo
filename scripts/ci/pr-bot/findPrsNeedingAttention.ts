const github = require("./shared/githubUtils");
const commentStrings = require("./shared/commentStrings");
const { ReviewerConfig } = require("./shared/reviewerConfig");
const { PersistentState } = require("./shared/persistentState");
const {
  BOT_NAME,
  REPO_OWNER,
  REPO,
  PATH_TO_CONFIG_FILE,
  SLOW_REVIEW_LABEL,
} = require("./shared/constants");

function hasLabel(pull: any, labelName: string): boolean {
  const labels = pull.labels;
  for (const label of labels) {
    if (label.name.toLowerCase() === labelName.toLowerCase()) {
      return true;
    }
  }
  return false;
}

function getTwoWeekdaysAgo(): Date {
  // TODO - return to this approach instead of 20 minutes ago like it currently is.
  // let twoWeekDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  // const currentDay = new Date(Date.now()).getDay();
  // // If Saturday, sunday, monday, or tuesday, add extra time to account for weekend.
  // if (currentDay === 6) {
  //   twoWeekDaysAgo.setDate(twoWeekDaysAgo.getDate() - 1);
  // }
  // if (currentDay <= 2) {
  //   twoWeekDaysAgo.setDate(twoWeekDaysAgo.getDate() - 2);
  // }

  // return twoWeekDaysAgo;

  return new Date(Date.now() - 20 * 60 * 1000);
}

async function isSlowReview(pull: any): Promise<boolean> {
  if (!hasLabel(pull, "Next Action: Reviewers")) {
    return false;
  }
  const lastModified = new Date(pull.updated_at);
  // TODO - bump this back to 7 days when done testing.
  const sevenDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  if (lastModified.getTime() < sevenDaysAgo.getTime()) {
    return true;
  }

  // If it has no comments from a non-bot/author in the last 2 weekdays, return true
  const twoWeekDaysAgo = getTwoWeekdaysAgo();
  if (lastModified.getTime() < twoWeekDaysAgo.getTime()) {
    const pullAuthor = pull.user.login;
    const githubClient = github.getGitHubClient();
    const comments = (
      await githubClient.rest.issues.listComments({
        owner: REPO_OWNER,
        repo: REPO,
        issue_number: pull.number,
      })
    ).data;
    for (let i = 0; i < comments.length; i++) {
      const comment = comments[i];
      if (comment.user.login != pullAuthor && comment.user.login != BOT_NAME) {
        return false;
      }
    }

    const reviewComments = (
      await githubClient.rest.pulls.listReviewComments({
        owner: REPO_OWNER,
        repo: REPO,
        pull_number: pull.number,
      })
    ).data;
    for (let i = 0; i < reviewComments.length; i++) {
      const comment = reviewComments[i];
      if (comment.user.login != pullAuthor && comment.user.login != BOT_NAME) {
        return false;
      }
    }

    return true;
  }

  return false;
}

async function assignToNewReviewers(
  pull: any,
  reviewerConfig: typeof ReviewerConfig,
  stateClient: typeof PersistentState
) {
  let prState = await stateClient.getPrState(pull.number);
  let reviewerStateToUpdate = {};
  const labels = Object.keys(prState);
  let reviewersToExclude = Object.values(prState);
  reviewersToExclude.push(pull.user.login);
  const reviewersForLabels: { [key: string]: string[] } =
    reviewerConfig.getReviewersForLabels(labels, reviewersToExclude);
  for (const label of labels) {
    let availableReviewers = reviewersForLabels[label];
    let reviewersState = await stateClient.getReviewersForLabelState(label);
    let chosenReviewer = reviewersState.assignNextCommitter(availableReviewers);
    reviewerStateToUpdate[label] = reviewersState;
    prState.reviewersAssignedForLabels[label] = chosenReviewer;
  }

  console.log(`Assigning new reviewers for pr ${pull.number}`);
  await github.addPrComment(
    pull.number,
    commentStrings.assignNewReviewer(prState.reviewersAssignedForLabels)
  );

  await stateClient.writePrState(pull.number, prState);
  let labelsToUpdate = Object.keys(reviewerStateToUpdate);
  for (let i = 0; i < labelsToUpdate.length; i++) {
    let label = labelsToUpdate[i];
    await stateClient.writeReviewersForLabelState(
      label,
      reviewerStateToUpdate[label]
    );
  }
}

// Flag any prs that have been awaiting reviewer action at least 7 days,
// or have been awaiting initial review for at least 2 days and ping the reviewers
// If there's still no action after 2 more days, assign a new set of committers.
async function processPull(
  pull: any,
  reviewerConfig: typeof ReviewerConfig,
  stateClient: typeof PersistentState
) {
  if (hasLabel(pull, SLOW_REVIEW_LABEL)) {
    const lastModified = new Date(pull.updated_at);
    const twoWeekDaysAgo = getTwoWeekdaysAgo();
    if (lastModified.getTime() < twoWeekDaysAgo.getTime()) {
      await assignToNewReviewers(pull, reviewerConfig, stateClient);
    }

    return;
  }

  if (await isSlowReview(pull)) {
    console.log(`Flagging pr ${pull.number} as slow.`);
    const client = github.getGitHubClient();
    const prState = await stateClient.getPrState(pull.number);
    const currentReviewers = prState.reviewersAssignedForLabels;
    if (
      !prState.stopReviewerNotifications &&
      currentReviewers &&
      Object.values(currentReviewers).length > 0
    ) {
      console.log(
        `Flagging pr ${pull.number} as slow. Tagging reviewers ${currentReviewers}`
      );
      await github.addPrComment(
        pull.number,
        commentStrings.slowReview(Object.values(currentReviewers))
      );
      await client.rest.issues.addLabels({
        owner: REPO_OWNER,
        repo: REPO,
        issue_number: pull.number,
        labels: [SLOW_REVIEW_LABEL],
      });
    }
  }
}

async function processOldPrs() {
  const githubClient = github.getGitHubClient();
  let reviewerConfig = new ReviewerConfig(PATH_TO_CONFIG_FILE);
  let stateClient = new PersistentState();

  let openPulls = await githubClient.paginate(
    "GET /repos/{owner}/{repo}/pulls",
    {
      owner: REPO_OWNER,
      repo: REPO,
    }
  );

  for (let i = 0; i < openPulls.length; i++) {
    let pull = openPulls[i];
    await processPull(pull, reviewerConfig, stateClient);
  }
}

processOldPrs();

export {};
