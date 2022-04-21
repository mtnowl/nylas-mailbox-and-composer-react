import React from "react";
import Mailbox from "./component/Mailbox";
import "./styles.css";

export default function App() {
  const [appMounted, setAppMounted] = React.useState(true);
  // ^ Use the above to test mounting/unmounting the component
  // to ensure that event listners are properly unregistered

  return (
    <div className="App">
      <div>
        <button onClick={() => setAppMounted((v) => !v)}>
          {appMounted ? "Unmount" : "Mount"} Mailbox
        </button>
      </div>
      <br />
      <hr />
      <br />
      {appMounted ? <Mailbox /> : <p>The mailbox app has not been mounted</p>}
    </div>
  );
}
