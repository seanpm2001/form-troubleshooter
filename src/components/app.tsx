import { FunctionalComponent, h } from 'preact';
import { getCurrentUrl, route, Route, Router } from 'preact-router';

import Results from '../routes/results';
import NotFoundPage from '../routes/notfound';
import Header from './header';
import AuditSummary from './summary';
import { Tab, Tabs } from '@material-ui/core';
import { useEffect, useState } from 'preact/hooks';
import Details from '../routes/details';
import { getTreeNodeWithParents } from '../lib/tree-util';
import { runAudits } from '../lib/audits';
import { mockedAuditResult } from './test-data';

const tabs = [
  {
    name: 'Recommendations',
    route: '/recommendations.html',
  },
  {
    name: 'Common mistakes',
    route: '/mistakes.html',
  },
  {
    name: 'Form details',
    route: '/details.html',
  },
];

const App: FunctionalComponent = () => {
  const currentUrl = getCurrentUrl();
  const [tabIndex, setTabIndex] = useState(
    Math.max(
      tabs.findIndex(tab => tab.route === currentUrl),
      0,
    ),
  );
  const [auditResults, setAuditResuits] = useState<AuditDetails>(() => ({
    score: 0,
    results: [],
  }));

  useEffect(() => {
    // Send a message to the content script to audit the current page.
    // Need to do this every time the popup is opened.
    chrome?.tabs?.query({ active: true, currentWindow: true }, chromeTabs => {
      const tabId = chromeTabs[0].id;
      chrome.tabs.sendMessage(tabId!, { message: 'popup opened' });
    });

    if (chrome.runtime) {
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.message === 'stored element data') {
          chrome.storage.local.get(['tree'], result => {
            const tree = getTreeNodeWithParents(result.tree);
            setAuditResuits(runAudits(tree));
          });
        }
      });
    } else {
      // test data for development
      setAuditResuits(mockedAuditResult);
    }
  }, []);

  const recommendations = auditResults.results.filter(result => result.type === 'error');
  const commonMistakes = auditResults.results.filter(result => result.type !== 'error');

  return (
    <div id="preact_root">
      <Header />
      <AuditSummary score={auditResults.score} recommendations={recommendations} commonMistakes={commonMistakes} />
      <div class="tabWrapper">
        <Tabs
          className="tabs"
          value={tabIndex}
          onChange={(event, newValue) => {
            setTabIndex(newValue);
            route(tabs[newValue].route);
          }}
        >
          {tabs.map(tab => (
            <Tab key={tab.name} label={tab.name} />
          ))}
        </Tabs>
      </div>
      <Router>
        <Redirect path="/" to="/recommendations.html" />
        <Redirect path="/index.html" to="/recommendations.html" />
        <Route path="/recommendations.html" component={Results} results={recommendations} />
        <Route path="/mistakes.html" component={Results} results={commonMistakes} />
        <Route path="/details.html" component={Details} />
        <NotFoundPage default />
      </Router>
    </div>
  );
};

const Redirect: FunctionalComponent<{ to: string }> = props => {
  route(props.to, true);
  return null;
};

export default App;
