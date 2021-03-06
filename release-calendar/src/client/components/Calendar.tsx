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

import '../stylesheets/calendar.scss';
import * as React from 'react';
import {ApiService} from '../api-service';
import {Channel} from '../../types';
import {ReleaseEventInput} from '../models/view-models';
import {Tooltip} from './Tooltip';
import {getAllEvents, getSingleReleaseEvents} from '../models/release-event';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';

const CALENDAR_CONTENT_HEIGHT = 610;
const EVENT_LIMIT_DISPLAYED = 3;

export interface CalendarProps {
  channels: Channel[];
  singleRelease: string;
}

export interface CalendarState {
  allEvents: Map<Channel, ReleaseEventInput[]>;
  singleEvents: ReleaseEventInput[];
}

export class Calendar extends React.Component<CalendarProps, CalendarState> {
  private apiService: ApiService;

  constructor(props: Readonly<CalendarProps>) {
    super(props);
    this.state = {
      allEvents: new Map<Channel, ReleaseEventInput[]>(),
      singleEvents: [],
    };
    this.apiService = new ApiService();
  }

  async componentDidMount(): Promise<void> {
    const promotions = await this.apiService.getPromotions();
    this.setState({allEvents: getAllEvents(promotions)});
  }

  async componentDidUpdate(prevProps: CalendarProps): Promise<void> {
    if (prevProps.singleRelease != this.props.singleRelease) {
      if (this.props.singleRelease) {
        const promotionsOfSingleRelease = await this.apiService.getSinglePromotions(
          this.props.singleRelease,
        );
        this.setState((prevState: CalendarState) => ({
          singleEvents: getSingleReleaseEvents(
            promotionsOfSingleRelease,
            prevState.allEvents,
          ),
        }));
      } else {
        this.setState({singleEvents: []});
      }
    }
  }

  render(): JSX.Element {
    let displayEvents: ReleaseEventInput[] = [];
    if (this.props.singleRelease) {
      displayEvents = this.state.singleEvents;
    } else {
      this.props.channels
        .filter((channel) => this.state.allEvents.has(channel))
        .forEach((channel) =>
          displayEvents.push(...this.state.allEvents.get(channel)),
        );
    }

    return (
      <FullCalendar
        defaultView='dayGridMonth'
        header={{
          left: 'prev,next',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,listWeek',
        }}
        plugins={[dayGridPlugin, timeGridPlugin]}
        eventSources={[{events: displayEvents, textColor: 'white'}]}
        contentHeight={CALENDAR_CONTENT_HEIGHT}
        fixedWeekCount={false}
        displayEventTime={false}
        views={{month: {eventLimit: EVENT_LIMIT_DISPLAYED}}}
        eventRender={Tooltip}
      />
    );
  }
}
