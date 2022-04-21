import React from "react";
import "./Mailbox.css";
import "@nylas/components-mailbox";
import "@nylas/components-composer";

const NYLAS_MAILBOX_KEY: string = "56c53340-7315-4dd7-a282-3db270c1ef8d"; // getEnv("NYLAS_MAILBOX_KEY") || "";
const NYLAS_COMPOSER_KEY: string = "demo-composer"; // getEnv("NYLAS_COMPOSER_KEY") || "";
const REPLY_CLICK_EVENT: string = "replyClicked";
const REPLY_ALL_CLICK_EVENT: string = "replyAllClicked";
const FORWARD_CLICK_EVENT: string = "forwardClicked";
const DRAFT_CLICKED: string = "draftClicked";
// const DRAFT_THREAD_EVENT: string = "draftThreadEvent"; // Deprecated: DO NOT USE
const DRAFT_THREAD_CLICKED_EVENT: string = "draftThreadClicked"; // Available as of 1.1.6-canary.22, replaces "draftThreadEvent"
const DRAFT_UPDATED_EVENT: string = "draftUpdated";
const DRAFT_SAVED_EVENT: string = "draftSaved";
const COMPOSER_MESSAGE_SENT: string = "messageSent";

const OPEN_COMPOSER_EVENTS = [
  REPLY_CLICK_EVENT,
  REPLY_ALL_CLICK_EVENT,
  FORWARD_CLICK_EVENT,
  DRAFT_CLICKED,
  DRAFT_THREAD_CLICKED_EVENT
  // DRAFT_THREAD_EVENT // Deprecated, replaced by "DRAFT_THREAD_CLICKED_EVENT"
];

const UPDATE_MAILBOX_EVENTS = [
  COMPOSER_MESSAGE_SENT,
  DRAFT_UPDATED_EVENT,
  DRAFT_SAVED_EVENT
];

/**
 * Utilities & custom hooks
 */
const logger = {
  info: (...args: any[]) => console.info(...args),
  debug: (...args: any[]) => console.debug(...args)
};

const formatReplyBody = (body: string): string =>
  `<div><br/><div style="border-left: 3px solid #dfe1e8; padding-left: 1rem;">${body}</div></div>`;

const formatForwardBody = (body: string): string =>
  `<div><br/><div>---------- Forwarded message ---------</div><br/>${body}</div>`;

// NOTE: This gets a component ref even on first render.
// It avoids having `undefined` refs on initial load.
// This is a REACT specific issue.
const useCustomRef = (): [any, any] => {
  const [element, setElement] = React.useState(null);
  const ref = React.useCallback((node: any) => {
    if (node !== null) {
      setElement(node);
    }
  }, []);
  return [element, ref];
};

/**
 * Example mailbox component
 * --------------------------
 * This is an example of how the mailbox and composer components are being
 * sitched together using events. Mailbox events are being used to open
 * an instance of the Composer component, while the Composer events are
 * used to update the Mailbox instance when any email message changes
 * occur (e.g. sent an email, saved a draft, etc.)
 */
const Mailbox: React.FC = () => {
  const [composer, composerRef] = useCustomRef();
  const [mailbox, mailboxRef] = useCustomRef();

  /**
   * Callbacks
   */
  const openComposer = React.useCallback(
    (event: any) => {
      if (!composer) {
        return;
      }

      logger.debug(`[openComposer, event: ${event.type}] `, event);

      // NOTE: Composer component deals with the Message object (not Therad)
      // So this ends up being the object that you'll use to populate
      // various parts of the Composer component. Putting it into it's own
      // message variable for convinenace.

      // In general, avoid using `event.detail.value` here as not all of it's
      // properties are applicable when populating `composer.value`'s prop.
      const message = event?.detail?.message;

      switch (event?.type) {
        // case DRAFT_THREAD_EVENT: // Deprecated, use DRAFT_THREAD_CLICKED_EVENT
        case DRAFT_THREAD_CLICKED_EVENT:
        case DRAFT_CLICKED:
          composer.value = {
            ...message // NOTE: It's safe to just populate composer's value with all we get back from a draft (in.c files, to, cc, etc.) because composer's `value` prop type is `Message` (same type as `event.detail.message`)
          };
          break;
        case FORWARD_CLICK_EVENT:
          composer.value = {
            body: formatForwardBody(message.body),
            files: message.files,
            subject: `Fwd: ${message.subject}`,
            thread_id: message.thread_id // Required to ensure fwds/threads are associated to a thread
          };
          break;
        case REPLY_CLICK_EVENT:
        case REPLY_ALL_CLICK_EVENT:
          composer.value = {
            to: message.from, // NOTE: Setting who we are sending the email to when replying
            cc: event.type === REPLY_ALL_CLICK_EVENT ? message.cc : [], // NOTE: Only copy the CC field if replying to all
            body: formatReplyBody(message.body),
            subject: `Re: ${message.subject}`,
            files: message.files,
            thread_id: message.thread_id // Required to ensure fwds/messages are associated to a thread
          };
          break;
      }

      composer.open(); // Actually opens the composer
    },
    [composer]
  );

  const updateMailbox = React.useCallback(
    (event: any) => {
      if (!mailbox) {
        return;
      }

      logger.debug(`[updateMailbox, event: ${event.type}] `, event);

      // NOTE: This is to sync the mailbox component (UI) with changes made
      // in the composer component for a given message.
      const message = event?.detail?.message;

      switch (event?.type) {
        case DRAFT_UPDATED_EVENT:
        case DRAFT_SAVED_EVENT:
          mailbox.draftMessageUpdate(message);
          break;
        case COMPOSER_MESSAGE_SENT:
          mailbox.sentMessageUpdate(message);
          break;
      }
    },
    [mailbox]
  );

  const toggleDrafts = (event: React.ChangeEvent<HTMLInputElement>) => {
    mailbox.query_string = event.target.checked ? "in=drafts" : "in=inbox";
  };

  /**
   * Initialize components with defaults & event listeners
   */
  // NOTE: This is how we initialize the composer
  React.useEffect(() => {
    logger.debug("[useEffect composer] enter");
    if (!composer) {
      return;
    }

    // Component defaults (state, props, callbacks, etc.)
    composer.close(); // NOTE: Ensures that the composer is in a closed state on load
    // NOTE: closes the composer after a send email success event has occurred
    composer.afterSendSuccess = async () => {
      composer.close();
    };

    // Register event listeners that updates the mailbox
    // on specific composer events.
    UPDATE_MAILBOX_EVENTS.forEach((event) =>
      composer.addEventListener(event, updateMailbox)
    );

    return () => {
      logger.debug("[useEffect composer] exit");
      UPDATE_MAILBOX_EVENTS.forEach((event) =>
        composer.removeEventListener(event, updateMailbox)
      );
    };
  }, [composer, updateMailbox]);

  // NOTE: This is how we initialize the mailbox
  React.useEffect(() => {
    logger.debug("[useEffect mailbox] enter");
    if (!mailbox) {
      return;
    }

    // Component defaults (state, props, callbacks, etc.)
    // (none)

    // Register event listeners that updates the composer
    // on specific mailbox events (e.g. click reply all, click draft, etc.)
    OPEN_COMPOSER_EVENTS.forEach((event) =>
      mailbox.addEventListener(event, openComposer)
    );

    return () => {
      logger.debug("[useEffect mailbox] exit");
      OPEN_COMPOSER_EVENTS.forEach((event) =>
        mailbox.removeEventListener(event, openComposer)
      );
    };
  }, [mailbox, openComposer]);

  return (
    <div className="mailbox-app">
      <div className="action-bar">
        <button onClick={openComposer} disabled={!composer}>
          Compose New
        </button>
        <div>
          <input type="checkbox" onChange={toggleDrafts} /> Show drafts
        </div>
      </div>
      <br />
      <br />
      <nylas-mailbox
        ref={mailboxRef}
        id={NYLAS_MAILBOX_KEY}
        header="My Custom Mailbox"
        show_reply={true}
        show_reply_all={true}
        show_forward={true}
      ></nylas-mailbox>
      <div
        style={{
          position: "absolute",
          width: "60%",
          margin: "auto",
          right: "0",
          top: "0",
          zIndex: 2
        }}
      >
        <nylas-composer
          ref={composerRef}
          id={NYLAS_COMPOSER_KEY}
          show_header="true"
          show_subject="true"
          reset_after_send="true"
          reset_after_close="true"
        ></nylas-composer>
      </div>
    </div>
  );
};

export default Mailbox;
