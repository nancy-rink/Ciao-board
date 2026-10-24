// What each style is drawn from: the work, who made it, when and where, a few lines on it, and where to see it.
// Met pieces add the museum's public-domain photo and a link to its collection page.
const MET='https://www.metmuseum.org/art/collection/search/', MET_IMG='https://images.metmuseum.org/CRDImages/';
const HOUSE={work:'A Ciao Board colorway',when:'',tag:'House colors',text:'Not drawn from one work: a plain colorway for everyday use, chosen to read well across a room.'};
const STYLE_ART={
  classic:{work:'The split-flap board',by:'Solari di Udine and others',when:'1950s onward',where:'Italy and everywhere',tag:'Station boards, 1950s',
    text:'Split-flap boards spread through stations and airports from the late 1950s. Each flap is a printed card that drops into place, which is where the clatter comes from.'},
  daylight:HOUSE, mint:HOUSE, rail:HOUSE, harbor:HOUSE,
  glow:{work:'Dot-matrix and LED signs',when:'1980s onward',tag:'LED signs, 1980s',
    text:'Amber dot-matrix and LED signs replaced many flap boards from the 1980s: no moving parts, and no clatter.'},
  solari:{work:'Departure boards',by:'Solari di Udine',when:'1956 onward',where:'Udine, Italy',tag:'Solari, 1956',
    text:'Solari, a clockmaker from Friuli, installed its first split-flap departure board at Liège-Guillemins station in Belgium in 1956. Its boards went on to stations and airports around the world.'},
  patapata:{work:'Station departure boards',when:'1960s–2000s',where:'Japan',tag:'Japanese stations',
    text:'In Japan these boards are nicknamed patapata, after the sound they make. Rows were set flush left, with the train type, time and destination each on their own flaps.'},
  cifra:{work:'Cifra 3 clock',by:'Gino Valle for Solari',when:'1966',where:'Udine, Italy',tag:'Gino Valle, 1966',see:'MoMA, New York, holds one in its design collection.',
    text:'Gino Valle shrank the station board into a desk clock with a round body and a single row of flaps. It stayed in production for decades.'},
  ikarus:{work:'Ikarus 260 and 280 buses',by:'Ikarus',when:'1970s–80s',where:'Budapest and Székesfehérvár, Hungary',tag:'Ikarus, Budapest',
    text:'Ikarus was one of the largest bus makers in the world in the 1980s. Its blue buses, with a roll-sign over the windscreen, ran from Budapest to Havana.'},
  standard:{work:'NYC Transit Authority Graphics Standards Manual',by:'Massimo Vignelli and Bob Noorda (Unimark)',when:'1970',where:'New York',tag:'Vignelli & Noorda, 1970',see:'Every New York subway station.',
    text:'The manual set out one sign system for a subway that had three. It first called for black letters on white panels, with a colored disc for each line.'},
  doublearrow:{work:'British Rail identity',by:'Design Research Unit; Jock Kinneir and Margaret Calvert',when:'1965',where:'Britain',tag:'British Rail, 1965',
    text:'Gerald Barney’s double-arrow symbol and the Rail Alphabet lettering gave every station, train and timetable the same voice. The symbol still marks stations today.'},
  oxblood:{work:'Underground stations',by:'Leslie Green',when:'1906–07',where:'London',tag:'Leslie Green, 1906',see:'Covent Garden, Russell Square and other Piccadilly line stations.',
    text:'Leslie Green faced more than fifty stations in oxblood glazed terracotta, and tiled each platform in its own pattern so regulars knew their stop.'},
  ekimei:{work:'Station name signs (ekimeihyō)',where:'Japan',tag:'Japanese station signs',
    text:'Japanese platform signs name the station in large letters, with the stations either side and the direction of travel below.'},
  metro:{work:'Mexico City Metro identity',by:'Lance Wyman',when:'1969',where:'Mexico City',tag:'Lance Wyman, 1969',
    text:'Wyman gave each station a small picture as well as a name, so riders who couldn’t read could still find their stop. Line 1 is pink.'},
  ulm:{work:'Lufthansa identity',by:'Otl Aicher and the Ulm School of Design',when:'1962',where:'Ulm, Germany',tag:'Otl Aicher, 1962',
    text:'Aicher’s group built the airline’s look on a strict grid: yellow and navy, the crane in a circle, and one typeface for everything.'},
  olympia:{work:'Munich 1972 Olympic Games',by:'Otl Aicher',when:'1972',where:'Munich',tag:'Otl Aicher, 1972',
    text:'Aicher banned red and black and dressed the Games in light blue, green and silver, with pictograms for every sport.'},
  mexico68:{work:'Mexico 1968 Olympic Games',by:'Lance Wyman, Eduardo Terrazas and Pedro Ramírez Vázquez',when:'1968',where:'Mexico City',tag:'Wyman & Terrazas, 1968',
    text:'The logo’s rings grew into op-art stripes that ran across posters, tickets and uniforms.'},
  jetage:{work:'TWA Flight Center',by:'Eero Saarinen',when:'1962',where:'JFK Airport, New York',tag:'Eero Saarinen, 1962',see:'TWA Hotel, JFK Airport, New York.',
    text:'A concrete terminal shaped like a bird lifting off, with red carpets and curving white surfaces inside. It reopened as a hotel in 2019.'},
  dangan:{work:'Shinkansen 0 Series',when:'1964',where:'Japan',tag:'Tōkaidō Shinkansen, 1964',
    text:'The first bullet train, nicknamed dangan ressha, opened between Tokyo and Osaka just before the 1964 Olympics, in ivory with a blue stripe and a rounded nose.'},
  butterfly:{work:'Butterfly Stool',by:'Sori Yanagi',when:'1954',where:'Japan',tag:'Sori Yanagi, 1954',see:'MoMA, New York; still made by Tendo Mokko.',
    text:'Two identical pieces of bent plywood, joined by a brass rod and two screws. It looks like a butterfly, or a torii gate.'},
  marinedrive:{work:'Marine Drive’s Art Deco',when:'1930s',where:'Mumbai',tag:'Mumbai, 1930s',see:'Marine Drive and Oval Maidan, Mumbai.',
    text:'A seafront of cream plaster apartment blocks with sunbursts, ship railings and rounded corners, now a World Heritage site.'},
  calcadao:{work:'Copacabana promenade',by:'Roberto Burle Marx',when:'1970',where:'Rio de Janeiro',tag:'Burle Marx, 1970',see:'Avenida Atlântica, Rio de Janeiro.',
    text:'Black and white Portuguese stone paving in waves along the beach. Burle Marx kept the waves when he redesigned the promenade in 1970.'},
  cinetica:{work:'Kinetic art',by:'Jesús Rafael Soto and Carlos Cruz-Diez',when:'1950s–70s',where:'Venezuela and Paris',tag:'Soto & Cruz-Diez',see:'Museo de Arte Moderno Jesús Soto, Ciudad Bolívar.',
    text:'Fine colored lines and rods that seem to move and change color as you walk past.'},
  tonfan:{work:'Ton Fan Art Group',by:'Ho Kan and others',when:'1957',where:'Taipei',tag:'Ton Fan, 1957',
    text:'Eight young painters founded the group and showed abstract work in Taipei from 1957. Ho Kan’s pictures are a few colored shapes and lines on a wide pale ground.'},
  graphite:{work:'Drawings',by:'Nasreen Mohamedi',when:'1960s–80s',where:'Mumbai and Baroda, India',tag:'Nasreen Mohamedi',see:'The Met Breuer held her retrospective in 2016.',
    text:'Mohamedi drew grids and diagonals in ink and graphite with a ruler, quiet and exact, on small sheets of paper.'},
  kassak:{work:'MA magazine',by:'Lajos Kassák',when:'1916–25',where:'Budapest and Vienna',tag:'Lajos Kassák, 1920s',see:'Kassák Museum, Budapest.',
    text:'Kassák, a poet and painter, ran the avant-garde magazine MA (Today) and built pictures and pages from red and black blocks and heavy type.'},
  sbb:{work:'Swiss railway clock',by:'Hans Hilfiker',when:'1944',where:'Switzerland',tag:'Hans Hilfiker, 1944',see:'Any station of the Swiss Federal Railways.',
    text:'Hilfiker designed the clock for the Swiss Federal Railways and later added the red second hand, shaped like the disc a station master raised to send a train off. It pauses briefly at the top of each minute, waiting for the signal from the master clock.'},
  neon:{work:'Warsaw neon signs',when:'1950s–70s',where:'Warsaw, Poland',tag:'Warsaw, 1960s',see:'Neon Muzeum, Warsaw.',
    text:'In the decades after the war, Warsaw’s shops, cafés and cinemas were lit by hand-bent neon, many designed by leading graphic artists. Rescued signs now glow again in the Neon Muzeum.'},
  matyo:{work:'Matyó embroidery',where:'Mezőkövesd, Hungary',when:'late 19th century onward',tag:'Mezőkövesd, Hungary',see:'The Matyó Museum, Mezőkövesd.',
    text:'The Matyó of Mezőkövesd stitched big, bright roses onto black aprons, shirts and shawls. UNESCO lists their folk art as intangible heritage.'},
  bojagi:{work:'Bojagi (wrapping cloths)',where:'Korea',when:'Joseon dynasty onward',tag:'Korean bojagi',
    text:'Square cloths used to wrap, carry and cover things. Jogakbo were pieced from leftover scraps, often of fine ramie, so light shows through the seams like a stained-glass window.'},
  hakka:{work:'Hakka floral cloth',where:'Taiwan',when:'mid-20th century',tag:'Hakka cloth, Taiwan',
    text:'Printed cotton with big peonies on red, once used for quilts and bridal bundles. It became a symbol of Hakka culture in Taiwan and turns up on bags, shoes and shop fronts.'},
  barragan:{work:'Casa Gilardi and Cuadra San Cristóbal',by:'Luis Barragán',when:'1960s–70s',where:'Mexico City',tag:'Luis Barragán, 1970s',see:'Casa Luis Barragán, Mexico City, by appointment.',
    text:'Barragán built with plain walls painted in strong pink, ochre and purple, with water and light. He won the Pritzker Prize in 1980, and his own house and studio is a World Heritage site.'},
  werkstatte:{work:'Wiener Werkstätte',by:'Josef Hoffmann and Koloman Moser',when:'1903–32',where:'Vienna',tag:'Vienna, 1903',see:'MAK, Vienna; Neue Galerie, New York.',
    text:'A workshop that designed everything from cutlery to whole houses. Hoffmann was so fond of the black-and-white square that he was nicknamed “Quadratl-Hoffmann”.'},
  nixie:{work:'Nixie tubes',by:'Burroughs Corporation and others',when:'1950s–70s',where:'United States and Europe',tag:'Nixie tubes, 1950s',
    text:'Each glass tube holds a stack of wire characters in neon gas; the one switched on glows orange. Burroughs named them Nixies in the 1950s, and they lit up calculators, clocks and lab instruments until LEDs took over.'},
  marquee:{work:'Changeable-letter marquees',when:'1920s onward',where:'Movie palaces across the US',tag:'Cinema marquees',see:'The historic theaters on Broadway in downtown Los Angeles.',
    text:'Theater staff climbed ladders to slide plastic letters onto rails in front of a lit panel, spelling out the week’s films under a ring of bulbs.'},
  letterboard:{work:'Felt letter boards',when:'mid-20th century onward',tag:'Felt letter boards',
    text:'Boards of ribbed felt with push-in plastic letters listed diner menus, office directories and hymn numbers. They have come back as signs for kitchens and front halls.'},
  letterpress:{work:'Wood type',when:'19th century',where:'United States and Britain',tag:'Wood type',see:'Hamilton Wood Type & Printing Museum, Two Rivers, Wisconsin.',
    text:'Big letters for posters were cut from end-grain wood, set by hand and printed on a press, leaving a slight bite in the paper and ink that is never quite even.'},
  stitch:{work:'Sampler',by:'Evelina Hull',when:'1806',where:'Charlestown, Massachusetts',tag:'The Met, 1806',met:14058,img:'ad/web-large/119436.jpg',
    text:'Girls learned to sew by stitching samplers: rows of letters and numbers in silk cross-stitch on linen, often signed and dated. Evelina Hull made this one at about ten.'},
  flipdot:{work:'Flip-dot displays',by:'Ferranti-Packard and others',when:'1960s onward',tag:'Flip-dot signs',
    text:'Each dot is a small disc, yellow on one side and black on the other, turned by a tiny electromagnet. They were developed in the 1960s for stock exchange boards and still show destinations on buses and trains around the world, with a soft clatter when they change.'},
  scrabble:{work:'Scrabble',by:'Alfred Mosher Butts',when:'1938 onward',where:'New York',tag:'Alfred Butts, 1938',
    text:'Butts, an architect out of work in the Depression, set the letter values by counting how often each letter appeared on the front page of the New York Times. His game, first called Criss-Crosswords, became Scrabble in 1948.'},
  labeltape:{work:'Embossing label makers',by:'Dymo',when:'1958 onward',tag:'Dymo, 1958',
    text:'A hand-held label maker pressed raised letters into colored plastic tape, one squeeze of the trigger for each letter. The plastic turns white where it is stretched, so the letters stand out.'},
  geesbend:{work:'Blocks and Strips work-clothes quilt',by:'Emma Lee Pettway Campbell',when:'ca. 1950',where:'Gee’s Bend (Boykin), Alabama',tag:'The Met, ca. 1950',met:654093,nopic:'The Met’s photo of this quilt isn’t in the public domain; see it on the Met’s site.',
    text:'The women of Gee’s Bend made quilts from worn work clothes and feed sacks, improvising bold bars and blocks. Their quilts were shown in museums from 2002 on and changed how people see American art.'},
  starbethlehem:{work:'Star of Bethlehem Quilt',when:'ca. 1835',where:'Maryland',tag:'The Met, ca. 1835',met:13897,img:'ad/web-large/DP332326.jpg',
    text:'One great eight-pointed star pieced from hundreds of small diamonds, each ring of color radiating out from the center. It took real skill to make the points lie flat.'},
  buttoncopy:{work:'Button-copy freeway signs',by:'Caltrans',when:'1950s–2000s',where:'California',tag:'California freeways',
    text:'Before reflective sheeting, the letters on California’s big green signs were studded with glass reflector buttons that lit up in headlights. Most have now been replaced.'},
  googie:{work:'Googie architecture',when:'1950s–60s',where:'Los Angeles',tag:'LA, 1950s',see:'The Theme Building at LAX; Johnie’s Coffee Shop on Wilshire.',
    text:'Coffee shops, car washes and motels built for drivers, with upswept roofs, starbursts and boomerangs. The style takes its name from a Hollywood coffee shop called Googies.'},
  stahl:{work:'Stahl House (Case Study House No. 22)',by:'Pierre Koenig',when:'1960',where:'Hollywood Hills, Los Angeles',tag:'Pierre Koenig, 1960',see:'Stahl House, Hollywood Hills, by tour.',
    text:'A glass and steel house on a hillside lot, cantilevered over the city. Julius Shulman’s night photograph of it made it one of the best-known houses in LA.'},
  splash:{work:'A Bigger Splash',by:'David Hockney',when:'1967',where:'Los Angeles',tag:'David Hockney, 1967',see:'Tate, London.',
    text:'A flat, sunny California pool with a diving board and a pink house, and a splash that Hockney said took two weeks to paint for an instant of time.'},
  guayasamin:{work:'Paintings',by:'Oswaldo Guayasamín',when:'1940s–90s',where:'Quito, Ecuador',tag:'Oswaldo Guayasamín',see:'La Capilla del Hombre and Casa Museo Guayasamín, Quito.',
    text:'Ecuador’s best-known painter drew faces and hands in heavy, angular lines and earth colors, painting the suffering and dignity of the people of the Americas.'},
  william:{work:'Hippopotamus (“William”)',when:'ca. 1961–1878 B.C.',where:'Meir, Egypt, Middle Kingdom',tag:'The Met, ca. 1900 B.C.',met:544227,img:'eg/web-large/DP248993.jpg',see:'The Met, New York, Gallery 111.',
    text:'A faience hippo from the tomb of the official Senbi II, painted with the river plants he lived among. A 1931 magazine article named him William, and he has been the Met’s unofficial mascot ever since.'},
  iznik:{work:'Tile Panel',when:'second half of the 16th century',where:'Iznik, Turkey',tag:'The Met, 16th century',met:447013,img:'is/web-large/DT11978.jpg',see:'The Met, New York, Gallery 460.',
    text:'Iznik potters painted cobalt, turquoise and green on white stonepaste, and from the 1550s a bright tomato red. Tiles like these lined the mosques and palaces of Ottoman Istanbul.'},
  tiffany:{work:'Autumn Landscape',by:'Tiffany Studios, attributed to Agnes F. Northrop',when:'1923–24',where:'New York',tag:'The Met, 1923',met:282,see:'The Met, New York, the American Wing, Gallery 700.',nopic:'The Met’s photo of this window isn’t in the public domain; see it on the Met’s site.',
    text:'A window eleven feet tall: a river winds through autumn trees toward the mountains. Tiffany’s opalescent glass carries its color and texture in the sheet itself, rippled and layered, so little needs painting.'},
};
// The About sheet: opened from a style card, with Try this style at the foot
let aboutId=null;
function openAbout(id){
  const s=BOARD_STYLES.find(x=>x.id===id), a=STYLE_ART[id]; if(!s||!a)return; aboutId=id;
  $('abName').textContent=s.name; $('abNote').textContent=s.note;
  $('abWork').textContent=a.work+(a.from?', from '+a.from:'');
  $('abMeta').textContent=[a.by,a.when,a.where].filter(Boolean).join(' · ');
  $('abText').textContent=a.text;
  $('abSee').hidden=!a.see; $('abSee').lastChild.textContent=a.see||'';
  const pic=$('abPic'), img=pic.querySelector('img');
  pic.hidden=!a.img; img.removeAttribute('src'); if(a.img){img.src=MET_IMG+a.img;img.alt=a.work}
  $('abNoPic').hidden=!a.nopic; $('abNoPic').textContent=a.nopic||'';
  $('abLink').hidden=!a.met; if(a.met)$('abLink').href=MET+a.met;
  $('abTry').textContent=id===styleId?'On the board':'Try this style'; $('abTry').disabled=id===styleId;
  const d=$('aboutDlg'); if(!d.open)d.showModal();
}
$('abClose').onclick=()=>$('aboutDlg').close();
$('abTry').onclick=()=>{const id=aboutId;$('aboutDlg').close();tryStyle(id)};
$('aboutDlg').addEventListener('click',e=>{if(e.target===$('aboutDlg'))$('aboutDlg').close()}); // a tap outside the sheet
