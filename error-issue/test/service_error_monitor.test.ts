/**
 * Copyright 2020 The AMP HTML Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {ServiceErrorMonitor, ServiceName} from '../src/service_error_monitor';
import {Stackdriver} from 'error-issue-bot';
import {StackdriverApi} from '../src/stackdriver_api';

import {mocked} from 'ts-jest/utils';
import nock from 'nock';

describe('ServiceErrorMonitor', () => {
  let monitor: ServiceErrorMonitor;
  const stackdriver = ({
    listServiceGroups: jest.fn(),
  } as unknown) as StackdriverApi;

  const prodStableService: Stackdriver.ServiceContext = {
    service: 'CDN Production',
    version: '04-24 Stable (1234)',
  };

  const infrequentGroup: Stackdriver.ErrorGroupStats = {
    group: {
      name: 'Error: Infrequent error',
      groupId: 'infrequent_id',
    },
    count: 200,
    timedCounts: [
      {
        count: 4,
        startTime: new Date('Feb 25, 2020'),
        endTime: new Date('Feb 26, 2020'),
      },
    ],
    firstSeenTime: new Date('Feb 20, 2020'),
    numAffectedServices: 1,
    affectedServices: [prodStableService],
    representative: {message: 'Error: Infrequent error'},
  };
  const newGroup: Stackdriver.ErrorGroupStats = {
    group: {
      name: 'Error: New error',
      groupId: 'new_id',
    },
    count: 2000,
    timedCounts: [
      {
        count: 6000,
        startTime: new Date('Feb 25, 2020'),
        endTime: new Date('Feb 26, 2020'),
      },
    ],
    firstSeenTime: new Date('Feb 20, 2020'),
    numAffectedServices: 2,
    affectedServices: [prodStableService],
    representative: {message: 'Error: New error'},
  };
  const errorGroups = [infrequentGroup, newGroup];

  beforeAll(() => {
    nock.disableNetConnect();
  });

  afterAll(() => {
    nock.enableNetConnect();
  });

  beforeEach(() => {
    monitor = new ServiceErrorMonitor(
      stackdriver,
      ServiceName.DEVELOPMENT,
      5000
    );
    mocked(stackdriver.listServiceGroups).mockResolvedValue(errorGroups);
  });

  describe('newErrorsToReport', () => {
    it('ignores infrequent errors, scaled for the service', async () => {
      const newErrors = await monitor.newErrorsToReport();
      const newErrorIds = newErrors.map(({errorId}) => errorId);
      expect(newErrorIds).toEqual(['new_id']);
      expect(stackdriver.listServiceGroups).toHaveBeenCalledWith(
        'CDN Development',
        25
      );
    });
  });
});