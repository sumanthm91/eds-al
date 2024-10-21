import React, { useEffect, useState } from 'react';

import { defaultTheme, Provider, ListView, Item, Text, Heading, ActionButton, Flex, Picker as RSPicker, View, IllustratedMessage } from '@adobe/react-spectrum';
import NotFound from '@spectrum-icons/illustrations/NotFound';
import Copy from '@spectrum-icons/workflow/Copy';
import { calcEnvironment } from '../../../scripts/configs';

const Picker = props => {
  const [promotions, setPromotions] = useState({
    loading: false,
    data: [],
    error: false
  });

  const getPromoURL=()=>{
    return `${window.location.origin}/promotion-schedule.json`;
  };

  useEffect(() => {
    const env = calcEnvironment();
    let promotionScheduleURL = getPromoURL();
    if (env === 'dev') {
      promotionScheduleURL = 'http://localhost:6002/promotion-schedules.json';
    }
    console.log(window.location.href);

    fetch(promotionScheduleURL).then((response) => response.json()).then((data) => {
      if (data.total === 0) return;

      const { data: promotData } = data;
      const activePromos = promotData.filter((promo) => promo.status === '1' && promo.channel_web === '1');
      setPromotions({
        ...promotions,
        loading: false,
        data: activePromos
      });
    });
  }, []);

  const getClipBoard=(key)=> <ActionButton aria-label="Copy" onPress={() => copyToClipboard(key)}><Copy /></ActionButton>

  const parseDate = (date) => {
    const dateObj = new Date(date);
    const dirAttr = document.dir === 'rtl' ? 'ar-EG' : 'en-US';
    const dateStr = dateObj.toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const timeStr = dateObj.toLocaleTimeString(dirAttr);
    return `${dateStr} ${timeStr}`;
  }

  const copyToClipboard = value => {
    navigator.clipboard.writeText(value);
  };

  const getChannels = (item) => {
    const channels = [];
    if (item.channel_web === '1') {
      channels.push('Web');
    }
    if (item.channel_app === '1') {
      channels.push('App');
    }

    return channels.join(', ');
  }

  return <Provider theme={defaultTheme} height="100%">
    <Flex direction="column" height="100%">
    <ListView aria-label="List of Items"
        items={promotions.data}
        loadingState={promotions.loading}
        width="100%"
        height="100%"
        density="spacious"
      >
        {item => {
          return <Item key={item.schedule_id} textValue={item.rule_name}>
            <div className='promo-item'>
              <div className='promo-item--title'>
                <Text>{`${item.rule_name} (${item.schedule_id})`}</Text>
                {item.schedule_id && getClipBoard(item.schedule_id)}
              </div>
              <div className='promo-item--description'>
                <Text>{item.description_en}</Text>
              </div>
              <div className='promo-item--market'>
                <Text><span className='promo-item--title'>Market:</span> {item.market}</Text>
              </div>
              <div className='promo-item--channels'>
                <Text><span className='promo-item--title'>Channels:</span> {getChannels(item)}</Text>
              </div>
              <div className='promo-item--urlkey'>
                <Text><span className='promo-item--title'>URL Key:</span> {item.url_key}</Text>
                {item.url_key && getClipBoard(item.url_key)}
              </div>
              <div>
                <Text>{parseDate(item.start_date)} - {parseDate(item.end_date)}</Text>
              </div>
            </div>
          </Item>;
        }}
      </ListView>
    </Flex>
  </Provider>;
}

export default Picker;