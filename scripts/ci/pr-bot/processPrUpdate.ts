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

const github = require("@actions/github");
const commentStrings = require("./shared/commentStrings");
const { processCommand } = require("./shared/userCommand");
const { addPrComment, nextActionReviewers } = require("./shared/githubUtils");
const { PersistentState } = require("./shared/persistentState");
const { ReviewerConfig } = require("./shared/reviewerConfig");
const { PATH_TO_CONFIG_FILE } = require("./shared/constants");

async function areReviewersAssigned(
  pullNumber: number,
  stateClient: any
): Promise<boolean> {
  const prState = await stateClient.getPrState(pullNumber);
  return Object.values(prState.reviewersAssignedForLabels).length > 0;
}

async function processPrComment(
  payload: any,
  stateClient: any,
  reviewerConfig: any
) {
  const commentContents = payload.comment.body;
  const commentAuthor = payload.sender.login;
  console.log(commentContents);
  if (
    await processCommand(
      payload,
      commentAuthor,
      commentContents,
      stateClient,
      reviewerConfig
    )
  ) {
    // If we've processed a command, don't worry about trying to change the attention set.
    // This is not a meaningful push or comment from the author.
    console.log("Processed command");
    return;
  }

  // If comment was from the author, we should shift attention back to the reviewers.
  console.log(
    "No command to be processed, checking if we should shift attention to reviewers"
  );
  const pullAuthor =
    payload.issue?.user?.login || payload.pull_request?.user?.login;
  if (pullAuthor == commentAuthor) {
    await setNextActionReviewers(payload, stateClient);
  } else {
    console.log(
      `Comment was from ${commentAuthor}, not author: ${pullAuthor}. No action to take.`
    );
  }
}

// On approval from a reviewer we have assigned, assign committer if one not already assigned
async function processPrReview(
  payload: any,
  stateClient: any,
  reviewerConfig: any
) {
  if (payload.review.state != "approved") {
    return;
  }

  const pullNumber = payload.issue?.number || payload.pull_request?.number;
  if (!(await areReviewersAssigned(pullNumber, stateClient))) {
    return;
  }

  let prState = await stateClient.getPrState(pullNumber);
  // TODO(damccorm) - also check if the author is a committer, if they are don't auto-assign a committer
  if (await prState.isAnyAssignedReviewerCommitter()) {
    return;
  }

  let labelOfReviewer = prState.getLabelForReviewer(payload.sender.login);
  if (labelOfReviewer) {
    let reviewersState = await stateClient.getReviewersForLabelState(
      labelOfReviewer
    );
    let availableReviewers =
      reviewerConfig.getReviewersForLabel(labelOfReviewer);
    let chosenCommitter =
      reviewersState.assignNextCommitter(availableReviewers);
    prState.reviewersAssignedForLabels[labelOfReviewer] = chosenCommitter;

    // Set next action to committer
    await addPrComment(
      pullNumber,
      commentStrings.assignCommitter(chosenCommitter)
    );
    const existingLabels =
      payload.issue?.labels || payload.pull_request?.labels;
    await nextActionReviewers(pullNumber, existingLabels);
    prState.nextAction = "Reviewers";

    // Persist state
    await stateClient.writePrState(pullNumber, prState);
    await stateClient.writeReviewersForLabelState(
      labelOfReviewer,
      reviewersState
    );
  }
}

// On pr push or author comment, we should put the attention set back on the reviewers
async function setNextActionReviewers(payload: any, stateClient: any) {
  const pullNumber = payload.issue?.number || payload.pull_request?.number;
  if (!(await areReviewersAssigned(pullNumber, stateClient))) {
    console.log("No reviewers assigned, dont need to manipulate attention set");
    return;
  }
  const existingLabels = payload.issue?.labels || payload.pull_request?.labels;
  await nextActionReviewers(pullNumber, existingLabels);
  let prState = await stateClient.getPrState(pullNumber);
  prState.nextAction = "Reviewers";
  await stateClient.writePrState(pullNumber, prState);
}

async function processPrUpdate() {
  const reviewerConfig = new ReviewerConfig(PATH_TO_CONFIG_FILE);
  const context = github.context;
  console.log("Event context:");
  console.log(context);
  const payload = context.payload;

  // TODO(damccorm) - remove this when we roll out to more than go
  const existingLabels = payload.issue?.labels || payload.pull_request?.labels;
  let containsGoLabel = false;
  existingLabels.forEach(label => {
    if (label.name.toLowerCase() == "go") {
      containsGoLabel = true;
    }
  });
  if (!containsGoLabel) {
    console.log("Does not contain the go label - skipping");
    return;
  }

  if (!payload.issue?.pull_request && !payload.pull_request) {
    console.log("Issue, not pull request - returning");
    return;
  }
  const pullNumber = payload.issue?.number || payload.pull_request?.number;

  let stateClient = new PersistentState();
  let prState = await stateClient.getPrState(pullNumber);
  if (prState.stopReviewerNotifications) {
    console.log("Notifications have been paused for this pull - skipping");
    return;
  }

  switch (github.context.eventName) {
    case "pull_request_review_comment":
    case "issue_comment":
      console.log("Processing comment event");
      await processPrComment(payload, stateClient, reviewerConfig);
      break;
    case "pull_request_review":
      console.log("Processing Pr review event");
      await processPrReview(payload, stateClient, reviewerConfig);
      break;
    case "pull_request_target":
      if (payload.action == "synchronize") {
        console.log("Processing synchronize action");
        await setNextActionReviewers(payload, stateClient);
      }
      // TODO(damccorm) - it would be good to handle the following events here, even though they're not part of the normal workflow
      // review requested, assigned, label added, label removed
      break;
    default:
      console.log("Not a pr comment, push, or review, doing nothing");
  }
}

processPrUpdate();

export {};
