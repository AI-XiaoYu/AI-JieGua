window.Paipan = (function () {
  // ==================== CONSTANTS ====================

  var TRIGRAM_NAMES = ['', '乾 ☰', '兑 ☱', '离 ☲', '震 ☳', '巽 ☴', '坎 ☵', '艮 ☶', '坤 ☷'];
  var TRIGRAM_SHORT = ['', '乾', '兑', '离', '震', '巽', '坎', '艮', '坤'];
  var TRIGRAM_ELEMENT = ['', '金', '金', '火', '木', '木', '水', '土', '土'];
  var TRIGRAM_NATURE = ['', '天', '泽', '火', '雷', '风', '水', '山', '地'];

  var BRANCH_MAP = { '子': 1, '丑': 2, '寅': 3, '卯': 4, '辰': 5, '巳': 6, '午': 7, '未': 8, '申': 9, '酉': 10, '戌': 11, '亥': 12 };
  var STEM_MAP = { '甲': 1, '乙': 2, '丙': 3, '丁': 4, '戊': 5, '己': 6, '庚': 7, '辛': 8, '壬': 9, '癸': 10 };

  var LUNAR_MONTH_NAMES = ['', '正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '腊月'];
  var LUNAR_DAY_NAMES = ['', '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
    '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
    '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'];

  // 64 hexagrams keyed by "upperTrigram-lowerTrigram" (1-8 先天数)
  var HEXAGRAM_LOOKUP = {
    '1-1': { name: '乾为天', idx: 1, desc: '元亨利贞。自强不息，刚健中正。' },
    '1-2': { name: '天泽履', idx: 10, desc: '履虎尾，不咥人。如履薄冰，谨慎行事。' },
    '1-3': { name: '天火同人', idx: 13, desc: '同人于野。志同道合，协力共进。' },
    '1-4': { name: '天雷无妄', idx: 25, desc: '无妄之灾。顺其自然，不妄为。' },
    '1-5': { name: '天风姤', idx: 44, desc: '女壮勿取。邂逅相遇，审慎对待。' },
    '1-6': { name: '天水讼', idx: 6, desc: '有孚窒惕。争讼不宁，以和为贵。' },
    '1-7': { name: '天山遁', idx: 33, desc: '君子好遁。适时退避，以全其道。' },
    '1-8': { name: '天地否', idx: 12, desc: '否之匪人。闭塞不通，守正待时。' },
    '2-1': { name: '泽天夬', idx: 43, desc: '扬于王庭。决断果行，去除小人。' },
    '2-2': { name: '兑为泽', idx: 58, desc: '兑亨利贞。喜悦和乐，以诚相待。' },
    '2-3': { name: '泽火革', idx: 49, desc: '改命吉。变革维新，顺势而变。' },
    '2-4': { name: '泽雷随', idx: 17, desc: '元亨利贞。随时而行，顺天应人。' },
    '2-5': { name: '泽风大过', idx: 28, desc: '栋桡。过犹不及，矫枉过正。' },
    '2-6': { name: '泽水困', idx: 47, desc: '困亨贞。困而不失，守正脱困。' },
    '2-7': { name: '泽山咸', idx: 31, desc: '咸亨利贞。感应道交，心灵相通。' },
    '2-8': { name: '泽地萃', idx: 45, desc: '萃亨。聚集荟萃，同心协力。' },
    '3-1': { name: '火天大有', idx: 14, desc: '元亨。丰盛富有，顺天应人。' },
    '3-2': { name: '火泽睽', idx: 38, desc: '小事吉。乖离不合，求同存异。' },
    '3-3': { name: '离为火', idx: 30, desc: '利贞亨。光明依附，柔顺中正。' },
    '3-4': { name: '火雷噬嗑', idx: 21, desc: '亨利用狱。咬合决断，明罚敕法。' },
    '3-5': { name: '火风鼎', idx: 50, desc: '元吉亨。鼎新革故，养贤用能。' },
    '3-6': { name: '火水未济', idx: 64, desc: '亨小狐汔济。事未完成，慎始慎终。' },
    '3-7': { name: '火山旅', idx: 56, desc: '旅贞吉。行旅在外，柔顺守正。' },
    '3-8': { name: '火地晋', idx: 35, desc: '康侯用锡马。光明上进，柔进上行。' },
    '4-1': { name: '雷天大壮', idx: 34, desc: '利贞。强盛壮大，守正持中。' },
    '4-2': { name: '雷泽归妹', idx: 54, desc: '征凶无攸利。婚嫁之道，慎始敬终。' },
    '4-3': { name: '雷火丰', idx: 55, desc: '亨王假之。丰盛盈满，明以动之。' },
    '4-4': { name: '震为雷', idx: 51, desc: '亨震来虩虩。临危不惧，修省警惕。' },
    '4-5': { name: '雷风恒', idx: 32, desc: '亨无咎。恒久不变，守正持恒。' },
    '4-6': { name: '雷水解', idx: 40, desc: '利西南。解除困难，赦过宥罪。' },
    '4-7': { name: '雷山小过', idx: 62, desc: '亨可小事。小有过越，宜下不宜上。' },
    '4-8': { name: '雷地豫', idx: 16, desc: '利建侯行师。悦乐安和，顺以动之。' },
    '5-1': { name: '风天小畜', idx: 9, desc: '亨密云不雨。小有积蓄，以柔蓄刚。' },
    '5-2': { name: '风泽中孚', idx: 61, desc: '豚鱼吉。诚信感物，信及万物。' },
    '5-3': { name: '风火家人', idx: 37, desc: '利女贞。齐家治国，各正其位。' },
    '5-4': { name: '风雷益', idx: 42, desc: '利有攸往。增益利民，损上益下。' },
    '5-5': { name: '巽为风', idx: 57, desc: '小亨利有攸往。巽顺柔入，申命行事。' },
    '5-6': { name: '风水涣', idx: 59, desc: '亨王假有庙。涣散分离，聚合人心。' },
    '5-7': { name: '风山渐', idx: 53, desc: '女归吉。循序渐进，不可急躁。' },
    '5-8': { name: '风地观', idx: 20, desc: '盥而不荐。观仰察微，以观民风。' },
    '6-1': { name: '水天需', idx: 5, desc: '有孚光亨。需待时机，饮食宴乐。' },
    '6-2': { name: '水泽节', idx: 60, desc: '亨苦节不可贞。节制有度，过犹不及。' },
    '6-3': { name: '水火既济', idx: 63, desc: '亨小利贞。事已成就，守成慎终。' },
    '6-4': { name: '水雷屯', idx: 3, desc: '元亨利贞。万物始生，艰难创始。' },
    '6-5': { name: '水风井', idx: 48, desc: '改邑不改井。养而不穷，井德润物。' },
    '6-6': { name: '坎为水', idx: 29, desc: '习坎有孚。重重险阻，维心亨通。' },
    '6-7': { name: '水山蹇', idx: 39, desc: '利西南。艰难跋涉，知难而退。' },
    '6-8': { name: '水地比', idx: 8, desc: '吉原筮。亲比和睦，择善而从。' },
    '7-1': { name: '山天大畜', idx: 26, desc: '利贞。大畜其德，蓄势待发。' },
    '7-2': { name: '山泽损', idx: 41, desc: '有孚元吉。损下益上，损己利人。' },
    '7-3': { name: '山火贲', idx: 22, desc: '亨小利有攸往。文饰美化，返璞归真。' },
    '7-4': { name: '山雷颐', idx: 27, desc: '贞吉观颐。颐养身心，自求口实。' },
    '7-5': { name: '山风蛊', idx: 18, desc: '元亨利涉大川。整治腐败，振衰起弊。' },
    '7-6': { name: '山水蒙', idx: 4, desc: '亨匪我求童蒙。启蒙发智，因材施教。' },
    '7-7': { name: '艮为山', idx: 52, desc: '艮其背。知止不殆，适可而止。' },
    '7-8': { name: '山地剥', idx: 23, desc: '不利有攸往。剥落衰颓，顺而止之。' },
    '8-1': { name: '地天泰', idx: 11, desc: '小往大来。天地交泰，亨通安和。' },
    '8-2': { name: '地泽临', idx: 19, desc: '元亨利贞。临下亲民，以德化民。' },
    '8-3': { name: '地火明夷', idx: 36, desc: '利艰贞。明入地中，韬光养晦。' },
    '8-4': { name: '地雷复', idx: 24, desc: '亨出入无疾。一阳来复，万象更新。' },
    '8-5': { name: '地风升', idx: 46, desc: '元亨用见大人。上升渐进，积小成大。' },
    '8-6': { name: '地水师', idx: 7, desc: '贞丈人吉。师出有名，以正伐邪。' },
    '8-7': { name: '地山谦', idx: 15, desc: '亨君子有终。谦卑自牧，卑以自牧。' },
    '8-8': { name: '坤为地', idx: 2, desc: '元亨利牝马之贞。厚德载物，柔顺承天。' },
  };

  // ==================== FUNCTIONS ====================

  function getBranchNumber(ganzhi) {
    var branch = ganzhi.charAt(1);
    return BRANCH_MAP[branch] || 1;
  }

  function getLunarLib() {
    if (typeof lunar !== 'undefined' && lunar.Solar) return lunar;
    if (typeof Solar !== 'undefined' && typeof Lunar !== 'undefined') return { Solar: Solar, Lunar: Lunar };
    return null;
  }

  function getLunarData(year, month, day, hour, minute) {
    var lib = getLunarLib();
    if (!lib) throw new Error('农历库加载失败，请检查网络连接后刷新页面');

    var solar;
    if (lib.Solar.fromYmdHms) {
      solar = lib.Solar.fromYmdHms(year, month, day, hour, minute || 0, 0);
    } else if (lib.Solar.fromDate) {
      solar = lib.Solar.fromDate(new Date(year, month - 1, day, hour, minute || 0));
    } else {
      solar = lib.Solar.fromYmd(year, month, day);
    }

    var lunarData = solar.getLunar();

    return {
      yearGZ: lunarData.getYearInGanZhi(),
      monthGZ: lunarData.getMonthInGanZhi(),
      dayGZ: lunarData.getDayInGanZhi(),
      timeGZ: lunarData.getTimeInGanZhi(),
      lunarYear: lunarData.getYear(),
      lunarMonth: lunarData.getMonth(),
      lunarDay: lunarData.getDay(),
    };
  }

  function calcMeihua(yearBranch, lunarMonth, lunarDay, hourBranch) {
    var monthNum = Math.abs(lunarMonth);
    var dayNum = lunarDay;

    var upperNum = (yearBranch + monthNum + dayNum) % 8;
    if (upperNum === 0) upperNum = 8;

    var lowerNum = (yearBranch + monthNum + dayNum + hourBranch) % 8;
    if (lowerNum === 0) lowerNum = 8;

    var changingLine = (yearBranch + monthNum + dayNum + hourBranch) % 6;
    if (changingLine === 0) changingLine = 6;

    return { upperNum: upperNum, lowerNum: lowerNum, changingLine: changingLine };
  }

  // Trigrams as [bottom, middle, top] — 1=yang(—), 0=yin(- -)
  function trigramToYao(trigramNum) {
    var map = {
      1: [1, 1, 1], // 乾 ☰
      2: [1, 1, 0], // 兑 ☱
      3: [1, 0, 1], // 离 ☲
      4: [1, 0, 0], // 震 ☳
      5: [0, 1, 1], // 巽 ☴
      6: [0, 1, 0], // 坎 ☵
      7: [0, 0, 1], // 艮 ☶
      8: [0, 0, 0], // 坤 ☷
    };
    return map[trigramNum];
  }

  function buildHexagram(upperNum, lowerNum) {
    var upperYao = trigramToYao(upperNum);
    var lowerYao = trigramToYao(lowerNum);
    return lowerYao.concat(upperYao);
  }

  function buildMutualHexagram(originalLines) {
    var lowerTri = [originalLines[1], originalLines[2], originalLines[3]];
    var upperTri = [originalLines[2], originalLines[3], originalLines[4]];
    return lowerTri.concat(upperTri);
  }

  function buildChangedHexagram(originalLines, changingLine) {
    var lines = originalLines.slice();
    var idx = changingLine - 1;
    lines[idx] = lines[idx] === 1 ? 0 : 1;
    return lines;
  }

  function yaoToTrigramNum(yao3) {
    var key = yao3.join(',');
    var map = {
      '1,1,1': 1, // 乾 ☰
      '1,1,0': 2, // 兑 ☱
      '1,0,1': 3, // 离 ☲
      '1,0,0': 4, // 震 ☳
      '0,1,1': 5, // 巽 ☴
      '0,1,0': 6, // 坎 ☵
      '0,0,1': 7, // 艮 ☶
      '0,0,0': 8, // 坤 ☷
    };
    return map[key] || 8;
  }

  function getHexagramInfo(lines) {
    var lowerTri = lines.slice(0, 3);
    var upperTri = lines.slice(3, 6);
    var upperNum = yaoToTrigramNum(upperTri);
    var lowerNum = yaoToTrigramNum(lowerTri);
    var key = upperNum + '-' + lowerNum;
    return HEXAGRAM_LOOKUP[key] || { name: '未知卦', idx: 0, desc: '' };
  }

  // ==================== PUBLIC API ====================

  return {
    TRIGRAM_NAMES: TRIGRAM_NAMES,
    TRIGRAM_SHORT: TRIGRAM_SHORT,
    TRIGRAM_ELEMENT: TRIGRAM_ELEMENT,
    TRIGRAM_NATURE: TRIGRAM_NATURE,
    BRANCH_MAP: BRANCH_MAP,
    STEM_MAP: STEM_MAP,
    LUNAR_MONTH_NAMES: LUNAR_MONTH_NAMES,
    LUNAR_DAY_NAMES: LUNAR_DAY_NAMES,
    HEXAGRAM_LOOKUP: HEXAGRAM_LOOKUP,
    getBranchNumber: getBranchNumber,
    getLunarLib: getLunarLib,
    getLunarData: getLunarData,
    calcMeihua: calcMeihua,
    trigramToYao: trigramToYao,
    buildHexagram: buildHexagram,
    buildMutualHexagram: buildMutualHexagram,
    buildChangedHexagram: buildChangedHexagram,
    yaoToTrigramNum: yaoToTrigramNum,
    getHexagramInfo: getHexagramInfo,
  };
})();
