import React from "react";
import "@nylas/components-mailbox";
import "@nylas/components-composer";
import { getEnv } from "../../utils";
import { useUser } from "../../contexts/UserContext";
import NylasLayout from "../../components/Layouts/NylasLayout";

const NYLAS_MAILBOX_KEY: string = getEnv("NYLAS_MAILBOX_KEY") || "";
const NYLAS_COMPOSER_KEY: string = getEnv("NYLAS_COMPOSER_KEY") || "";
const COMPOSER_CLOSED_EVENT: string = "composerClosed";
const RETURN_TO_MAILBOX_EVENT: string = "returnToMailbox";
const REPLY_CLICK_EVENT: string = "replyClicked";
const REPLY_ALL_CLICK_EVENT: string = "replyAllClicked";
const FORWARD_CLICK_EVENT: string = "forwardClicked";
const DRAFT_THREAD_EVENT: string = "draftThreadEvent";
const DRAFT_UPDATED_EVENT: string = "draftUpdated";
const DRAFT_SAVED_EVENT: string = "draftSaved";

const MAILBOX_ACTION_EVENTS = [
  REPLY_CLICK_EVENT,
  REPLY_ALL_CLICK_EVENT,
  FORWARD_CLICK_EVENT,
  DRAFT_THREAD_EVENT,
];

const getReplyBody = (body: string): string =>
  `<div><br/><div style="border-left: 3px solid #dfe1e8; padding-left: 1rem;">${body}</div></div>`;

const Email: React.FC = () => {
  const { user } = useUser();
  const composerRef = React.useRef<any>();
  const mailboxRef = React.useRef<any>();
  const [shouldUpdate, setShouldUpdate] = React.useState(true);

  //Using this hack as the useRef returning undefined on first render
  React.useEffect(() => {
    if (shouldUpdate) setShouldUpdate(false);
  }, [shouldUpdate]);

  const hideComposer = () => {
    console.log("hiding the composer");
    composerRef.current?.close();
  };

  //@ts-ignore need to find type
  const actionClickedListener = (event) => {
    composerRef.current!.value = event.detail.value;
    const message = event.detail.message;
    if (Object.keys(message).length) {
      composerRef.current!.value = {
        ...composerRef.current!.value,
        body: getReplyBody(message.body),
        files: message.files,
        from: message.from ?? [],
        to: message.to ?? [],
        cc: message.cc ?? [],
      };
      composerRef.current!.open();
    }
  };

  //@ts-ignore need to find type
  const draftClickedListener = (event) => {
    const message = event.detail.message;
    console.log("draftClickedListener", message);
    if (message.object === "draft") {
      console.log("lets update the draft messages");

      mailboxRef.current?.draftMessageUpdate(message);
    }
  };

  const handleComposeEmail = () => composerRef.current!.open();

  React.useEffect(() => {
    const composerRefCurrent = composerRef.current;
    const mailboxRefCurrent = mailboxRef.current;
    composerRefCurrent?.addEventListener(COMPOSER_CLOSED_EVENT, hideComposer);
    composerRefCurrent?.addEventListener(
      COMPOSER_CLOSED_EVENT,
      draftClickedListener
    );
    composerRefCurrent?.addEventListener(
      DRAFT_UPDATED_EVENT,
      draftClickedListener
    );
    composerRefCurrent?.addEventListener(
      DRAFT_SAVED_EVENT,
      draftClickedListener
    );

    mailboxRefCurrent?.addEventListener(RETURN_TO_MAILBOX_EVENT, hideComposer);
    MAILBOX_ACTION_EVENTS.forEach((event) =>
      mailboxRefCurrent?.addEventListener(event, actionClickedListener)
    );
    //hide the composer in the beginning
    hideComposer();
    //hide the composer after email sending succeeds
    if (composerRefCurrent) {
      composerRefCurrent.afterSendSuccess = async () => {
        hideComposer();
      };
    }
    return () => {
      composerRefCurrent?.removeEventListener(
        COMPOSER_CLOSED_EVENT,
        hideComposer
      );
      mailboxRefCurrent?.removeEventListener(
        RETURN_TO_MAILBOX_EVENT,
        hideComposer
      );
      MAILBOX_ACTION_EVENTS.forEach((event) =>
        mailboxRefCurrent?.removeEventListener(event, actionClickedListener)
      );
    };
  });

  return (
    <NylasLayout>
      {/*Used to grab accesstoken under the hood. You can delete this and should work */}
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
        }}
      >
        <button
          onClick={handleComposeEmail}
          style={{
            background: "red",
            color: "white",
            padding: "8px",
            marginBottom: "8px",
          }}
        >
          Compose New
        </button>
        <nylas-mailbox
          ref={mailboxRef}
          id={NYLAS_MAILBOX_KEY}
          access_token={user?.nylas?.accessToken}
          header="Renegade Mailbox"
          show_reply={true}
          show_reply_all={true}
          show_forward={true}
        />
        <div
          style={{
            position: "absolute",
            width: "60%",
            margin: "auto",
            right: "0",
            top: "0",
          }}
        >
          <nylas-composer
            ref={composerRef}
            id={NYLAS_COMPOSER_KEY}
            access_token={user?.nylas?.accessToken}
            reset_after_close={true}
          />
        </div>
      </div>
    </NylasLayout>
  );
};

export default Email;
