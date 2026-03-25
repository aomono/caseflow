import { WebClient } from "@slack/web-api";

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

export async function sendSlackMessage(channel: string, text: string) {
  await slack.chat.postMessage({ channel, text });
}
