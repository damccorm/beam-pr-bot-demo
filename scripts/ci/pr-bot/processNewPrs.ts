/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const github = require("./shared/githubUtils");
const { getChecksStatus } = require("./shared/checks");
const commentStrings = require("./shared/commentStrings");
const { ReviewerConfig } = require("./shared/reviewerConfig");
const { PersistentState } = require("./shared/persistentState");
const { Pr } = require("./shared/pr");
const { REPO_OWNER, REPO, PATH_TO_CONFIG_FILE } = require("./shared/constants");
import { CheckStatus } from "./shared/checks";

/*
 * Returns true if the pr needs to be processed or false otherwise.
 * We don't need to process PRs that:
 * 1) Have WIP in their name
 * 2) Are less than 20 minutes old
 * 3) Are draft prs
 * 4) Are closed
 * 5) Have already been processed
 * 6) Have notifications stopped
 * 7) The pr doesn't contain the go label (temporary). TODO(damccorm) - remove this when we're ready to roll this out to everyone.
 * unless we're supposed to remind the user after tests pass
 * (in which case that's all we need to do).
 */
function needsProcessed(pull: any, prState: typeof Pr): boolean {
  if (!pull.labels.find((label) => label.name.toLowerCase() === "go")) {
    console.log(
      `Skipping PR ${pull.number} because it doesn't contain the go label`
    );
    return false;
  }
  if (prState.remindAfterTestsPass && prState.remindAfterTestsPass.length > 0) {
    return true;
  }
  if (pull.title.toLowerCase().indexOf("wip") >= 0) {
    console.log(`Skipping PR ${pull.number} because it is a WIP`);
    return false;
  }
  let timeCutoff = new Date(new Date().getTime() - 20 * 60000);
  if (new Date(pull.created_at) > timeCutoff) {
    console.log(
      `Skipping PR ${pull.number} because it was created less than 20 minutes ago`
    );
    return false;
  }
  if (pull.state.toLowerCase() !== "open") {
    console.log(`Skipping PR ${pull.number} because it is closed`);
    return false;
  }
  if (pull.draft) {
    console.log(`Skipping PR ${pull.number} because it is a draft`);
    return false;
  }
  if (prState.stopReviewerNotifications) {
    console.log(
      `Skipping PR ${pull.number} because reviewer notifications have been stopped`
    );
    return false;
  }

  return true;
}

/*
 * If the checks passed in via checkstate have completed, notifies the users who have configured notifications.
 */
async function remindIfChecksCompleted(
  pull: any,
  stateClient: typeof PersistentState,
  checkState: CheckStatus,
  prState: typeof Pr
) {
  console.log(
    `Notifying reviewers if checks for PR ${pull.number} have completed, then returning`
  );
  if (!checkState.completed) {
    return;
  }
  if (checkState.succeeded) {
    await github.addPrComment(
      pull.number,
      commentStrings.allChecksPassed(prState.remindAfterTestsPass)
    );
  } else {
    await github.addPrComment(
      pull.number,
      commentStrings.someChecksFailing(prState.remindAfterTestsPass)
    );
  }
  prState.remindAfterTestsPass = [];
  await stateClient.writePrState(pull.number, prState);
}

/*
 * If we haven't already, let the author know checks are failing.
 */
async function notifyChecksFailed(
  pull: any,
  stateClient: typeof PersistentState,
  prState: typeof Pr
) {
  console.log(
    `Checks are failing for PR ${pull.number}. Commenting if we haven't already and skipping.`
  );
  if (!prState.commentedAboutFailingChecks) {
    await github.addPrComment(
      pull.number,
      commentStrings.failingChecksCantAssign()
    );
  }
  prState.commentedAboutFailingChecks = true;
  await stateClient.writePrState(pull.number, prState);
}

async function approvedBy(pull: any): Promise<string[]> {
  const reviews = await github.getGitHubClient().rest.pulls.listReviews({
    owner: REPO_OWNER,
    repo: REPO,
    pull_number: pull.number,
  });

  return reviews.data.map((review) => review.user.login);
}

/*
 * Performs all the business logic of processing a new pull request, including:
 * 1) Checking if it needs processed
 * 2) Reminding reviewers if checks have completed (if they've subscribed to that)
 * 3) Picking/assigning reviewers
 * 4) Adding "Next Action: Reviewers label"
 * 5) Storing the state of the pull request/reviewers in a dedicated branch.
 */
async function processPull(
  pull: any,
  reviewerConfig: typeof ReviewerConfig,
  stateClient: typeof PersistentState
) {
  let prState = await stateClient.getPrState(pull.number);
  if (!needsProcessed(pull, prState)) {
    return;
  }

  if (Object.keys(prState.reviewersAssignedForLabels).length > 0) {
    if (prState.committerAssigned) {
      console.log(
        `Skipping PR ${pull.number} because a committer has been assigned`
      );
      return;
    }

    const approvers = await approvedBy(pull);
    if (!approvers || approvers.length == 0) {
      console.log(
        `Skipping PR ${pull.number} because reviewers are assigned but haven't approved`
      );
      return;
    }

    for (const approver of approvers) {
      console.log(approver);
      const labelOfReviewer = prState.getLabelForReviewer(approver);
      if (labelOfReviewer) {
        let reviewersState = await stateClient.getReviewersForLabelState(
          labelOfReviewer
        );
        const availableReviewers =
          reviewerConfig.getReviewersForLabel(labelOfReviewer);
        const chosenCommitter = await reviewersState.assignNextCommitter(
          availableReviewers
        );
        prState.reviewersAssignedForLabels[labelOfReviewer] = chosenCommitter;
        prState.committerAssigned = true;

        // Set next action to committer
        await github.addPrComment(
          pull.number,
          commentStrings.assignCommitter(chosenCommitter)
        );
        await github.nextActionReviewers(pull.number, pull.labels);
        // TODO - refactor to shared constant
        prState.nextAction = "Reviewers";

        // Persist state
        await stateClient.writePrState(pull.number, prState);
        await stateClient.writeReviewersForLabelState(
          labelOfReviewer,
          reviewersState
        );

        return;
      }
    }
  }

  return;

  let checkState = await getChecksStatus(REPO_OWNER, REPO, pull.head.sha);

  if (prState.remindAfterTestsPass && prState.remindAfterTestsPass.length > 0) {
    return await remindIfChecksCompleted(
      pull,
      stateClient,
      checkState,
      prState
    );
  }

  if (!checkState.succeeded) {
    return await notifyChecksFailed(pull, stateClient, prState);
  }
  prState.commentedAboutFailingChecks = false;

  // Pick reviewers to assign. Store them in reviewerStateToUpdate and update the prState object with those reviewers (and their associated labels)
  let reviewerStateToUpdate: { [key: string]: typeof ReviewersForLabel } = {};
  const reviewersForLabels: { [key: string]: string[] } =
    reviewerConfig.getReviewersForLabels(pull.labels, [pull.user.login]);
  var labels = Object.keys(reviewersForLabels);
  if (!labels || labels.length === 0) {
    return;
  }
  for (const label of labels) {
    let availableReviewers = reviewersForLabels[label];
    let reviewersState = await stateClient.getReviewersForLabelState(label);
    let chosenReviewer = reviewersState.assignNextReviewer(availableReviewers);
    reviewerStateToUpdate[label] = reviewersState;
    prState.reviewersAssignedForLabels[label] = chosenReviewer;
  }

  console.log(`Assigning reviewers for PR ${pull.number}`);
  await github.addPrComment(
    pull.number,
    commentStrings.assignReviewer(prState.reviewersAssignedForLabels)
  );

  github.nextActionReviewers(pull.number, pull.labels);
  prState.nextAction = "Reviewers";

  await stateClient.writePrState(pull.number, prState);
  let labelsToUpdate = Object.keys(reviewerStateToUpdate);
  for (const label of labelsToUpdate) {
    await stateClient.writeReviewersForLabelState(
      label,
      reviewerStateToUpdate[label]
    );
  }
}

async function processNewPrs() {
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

  for (const pull of openPulls) {
    await processPull(pull, reviewerConfig, stateClient);
  }
}

processNewPrs();

export {};
