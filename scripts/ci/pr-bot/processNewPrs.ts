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
const { REPO_OWNER, REPO, PATH_TO_CONFIG_FILE } = require("./shared/constants");
const path = require("path");

// Returns true if the pr needs to be processed or false otherwise.
// We don't need to process PRs that:
// 1) Have WIP in their name
// 2) Are less than 20 minutes old
// 3) Are draft prs
// 4) Are closed
// 5) Have already been processed
// unless we're supposed to remind the user after tests pass
// (in which case that's all we need to do).
function needsProcessed(pull, prState): boolean {
  if (prState.remindAfterTestsPass && prState.remindAfterTestsPass.length > 0) {
    return true;
  }
  if (pull.title.toLowerCase().indexOf("wip") >= 0) {
    console.log(`Skipping pr ${pull.number} because it is a WIP`);
    return false;
  }
  let timeCutoff = new Date(new Date().getTime() - 20 * 60000);
  if (new Date(pull.created_at) > timeCutoff) {
    console.log(
      `Skipping pr ${pull.number} because it was created less than 20 minutes ago`
    );
    return false;
  }
  if (pull.state.toLowerCase() != "open") {
    console.log(`Skipping pr ${pull.number} because it is closed`);
    return false;
  }
  if (pull.draft) {
    console.log(`Skipping pr ${pull.number} because it is a draft`);
    return false;
  }
  if (Object.keys(prState.reviewersAssignedForLabels).length > 0) {
    console.log(
      `Skipping pr ${pull.number} because it already has been assigned`
    );
    return false;
  }
  if (prState.stopReviewerNotifications) {
    console.log(
      `Skipping pr ${pull.number} because reviewer notifications have been stopped`
    );
    return false;
  }

  return true;
}

// If the checks passed in via checkstate have completed, notifies the users who have configured notifications.
async function remindIfChecksCompleted(pull, stateClient, checkState, prState) {
  console.log(
    `Notifying reviewers if checks for pr ${pull.number} have completed, then returning`
  );
  if (checkState.completed) {
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
}

// If we haven't already
async function notifyChecksFailed(pull, stateClient, prState) {
  console.log(
    `Checks are failing for pr ${pull.number}. Commenting if we haven't already and skipping.`
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

// Performs all the business logic of processing a new pull request, including:
// 1) Checking if it needs processed
// 2) Reminding reviewers if checks have completed (if they've subscribed to that)
// 3) Picking/assigning reviewers
// 4) Adding "Next Action: Reviewers label"
// 5) Storing the state of the pull request/reviewers in a dedicated branch.
async function processPull(pull, reviewerConfig, stateClient) {
  let prState = await stateClient.getPrState(pull.number);
  if (!needsProcessed(pull, prState)) {
    return;
  }

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
  let reviewerStateToUpdate = {};
  const reviewersForLabels: { [key: string]: string[] } =
    reviewerConfig.getReviewersForLabels(pull.labels, [pull.user.login]);
  var labels = Object.keys(reviewersForLabels);
  if (!labels || labels.length == 0) {
    return;
  }
  for (let i = 0; i < labels.length; i++) {
    let label = labels[i];
    let availableReviewers = reviewersForLabels[label];
    let reviewersState = await stateClient.getReviewersForLabelState(label);
    let chosenReviewer = reviewersState.assignNextReviewer(availableReviewers);
    reviewerStateToUpdate[label] = reviewersState;
    prState.reviewersAssignedForLabels[label] = chosenReviewer;
  }

  console.log(`Assigning reviewers for pr ${pull.number}`);
  await github.addPrComment(
    pull.number,
    commentStrings.assignReviewer(prState.reviewersAssignedForLabels)
  );

  github.nextActionReviewers(pull.number, pull.labels);
  prState.nextAction = "Reviewers";

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

  for (let i = 0; i < openPulls.length; i++) {
    let pull = openPulls[i];
    await processPull(pull, reviewerConfig, stateClient);
  }
}

processNewPrs();

export {};
