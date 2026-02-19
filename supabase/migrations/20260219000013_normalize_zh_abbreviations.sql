-- Normalize non-Chinese abbreviations in Chinese-language assets.

-- K2vBHUUqWoI: talks/Talks -> 演讲
UPDATE public.video_catalog
SET title = replace(replace(title, 'Talks', '演讲'), 'talks', '演讲'),
    channel = replace(replace(channel, 'Talks', '演讲'), 'talks', '演讲')
WHERE language = 'zh'
  AND video_id = 'K2vBHUUqWoI';

UPDATE public.video_artifacts
SET meta = replace(replace(meta::text, 'Talks', '演讲'), 'talks', '演讲')::jsonb,
    segments = replace(replace(segments::text, 'Talks', '演讲'), 'talks', '演讲')::jsonb,
    connected_speech = replace(replace(connected_speech::text, 'Talks', '演讲'), 'talks', '演讲')::jsonb,
    structure = replace(replace(structure::text, 'Talks', '演讲'), 'talks', '演讲')::jsonb
WHERE language = 'zh'
  AND video_id = 'K2vBHUUqWoI';

-- xW2mUoTjEMw: GDP -> 国内生产总值 (and matching pinyin / Korean translations)
UPDATE public.video_artifacts
SET segments = replace(
                  replace(
                    replace(
                      replace(
                        replace(
                          replace(
                            replace(
                              replace(
                                replace(
                                  replace(
                                    replace(
                                      replace(segments::text,
                                        '但GDP却是北京的将近5倍',
                                        '但国内生产总值却是北京的将近5倍'
                                      ),
                                      'dàn GDP què shì Běijīng de jiāngjìn wǔ bèi',
                                      'dàn guónèi shēngchǎn zǒngzhí què shì Běijīng de jiāngjìn wǔ bèi'
                                    ),
                                    '하지만 GDP는 베이징의 거의 5배에 달합니다',
                                    '하지만 국내총생산은 베이징의 거의 5배에 달합니다'
                                  ),
                                  '也是GDP总量排名世界第一的都会区',
                                  '也是国内生产总值总量排名世界第一的都会区'
                                ),
                                'yě shì GDP zǒngliàng páimíng shìjiè dìyī de dūhuìqū',
                                'yě shì guónèi shēngchǎn zǒngzhí zǒngliàng páimíng shìjiè dìyī de dūhuìqū'
                              ),
                              'GDP 총량도 세계 1위인 도시권입니다',
                              '국내총생산 총량도 세계 1위인 도시권입니다'
                            ),
                            '东京的GDP约为1.07万亿美元',
                            '东京的国内生产总值约为1.07万亿美元'
                          ),
                          'Dōngjīng de GDP yuē wéi yī diǎn líng qī wànyì měiyuán',
                          'Dōngjīng de guónèi shēngchǎn zǒngzhí yuē wéi yī diǎn líng qī wànyì měiyuán'
                        ),
                        '도쿄의 GDP는 약 1조 700억 달러입니다',
                        '도쿄의 국내총생산은 약 1조 700억 달러입니다'
                      ),
                      '相当于韩国全国GDP总和',
                      '相当于韩国全国国内生产总值总和'
                    ),
                    'xiāngdāng yú Hánguó quánguó GDP zǒnghé',
                    'xiāngdāng yú Hánguó quánguó guónèi shēngchǎn zǒngzhí zǒnghé'
                  ),
                  '이는 한국 전체 GDP 합계에 맞먹는 수치입니다',
                  '이는 한국 전체 국내총생산 합계에 맞먹는 수치입니다'
                )::jsonb,
    grammar = replace(
                replace(
                  replace(grammar::text,
                    '既是世界上最大的都会区 也是GDP总量排名世界第一的都会区',
                    '既是世界上最大的都会区 也是国内生产总值总量排名世界第一的都会区'
                  ),
                  'jì shì shìjiè shàng zuìdà de dūhuìqū yě shì GDP zǒngliàng páimíng shìjiè dìyī de dūhuìqū',
                  'jì shì shìjiè shàng zuìdà de dūhuìqū yě shì guónèi shēngchǎn zǒngzhí zǒngliàng páimíng shìjiè dìyī de dūhuìqū'
                ),
                '세계 최대의 도시권일 뿐만 아니라 GDP 총량도 세界 1위인 도시권이기도 합니다',
                '세계 최대의 도시권일 뿐만 아니라 국내총생산 총량도 세계 1위인 도시권이기도 합니다'
              )::jsonb,
    structure = replace(
                  replace(
                    replace(
                      replace(
                        replace(
                          replace(structure::text,
                            ' its GDP is nearly 5 times larger',
                            ' its domestic product (国内生产总值) is nearly 5 times larger'
                          ),
                          '면적은 베이징의 1/8이지만 GDP는 약 5배로',
                          '면적은 베이징의 1/8이지만 국내총생산은 약 5배로'
                        ),
                        '면적 대비 GDP: 베이징 면적의 1/8이지만 GDP는 약 5배',
                        '면적 대비 국내총생산: 베이징 면적의 1/8이지만 국내총생산은 약 5배'
                      ),
                      'largest GDP (~1.07 trillion USD',
                      'largest domestic product (国内生产总值, ~1.07 trillion USD'
                    ),
                    '세계 최대 GDP(약 1조 700억 달러, 한국 전체 GDP에 맞먹음)',
                    '세계 최대 국내총생산(약 1조 700억 달러, 한국 전체 국내총생산에 맞먹음)'
                  ),
                  '도쿄 광역권 GDP: 약 1.07조 달러 (한국 전체 GDP 수준)',
                  '도쿄 광역권 국내총생산: 약 1.07조 달러 (한국 전체 국내총생산 수준)'
                )::jsonb
WHERE language = 'zh'
  AND video_id = 'xW2mUoTjEMw';
