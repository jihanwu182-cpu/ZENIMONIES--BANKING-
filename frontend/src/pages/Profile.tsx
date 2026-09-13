import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface User {
  id?: string | number;
  full_name?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  date_of_birth?: string;
  dob?: string;
  address?: string;
  residential_address?: string;
  city?: string;
  state?: string;
  lga?: string;
  country?: string;
  role?: string;
  kyc_status?: string;
  kyc_tier?: number;
  tier?: number;
  is_verified?: boolean;
  profile_photo?: string;
  avatar?: string;
}

interface Account {
  account_number?: string;
  account_name?: string;
  account_type?: string;
  currency?: string;
  balance?: number;
  status?: string;
}

/*
============================================================
NIGERIA
36 STATES + FCT
============================================================
*/

const NIGERIAN_STATES = [
  'Abia',
  'Adamawa',
  'Akwa Ibom',
  'Anambra',
  'Bauchi',
  'Bayelsa',
  'Benue',
  'Borno',
  'Cross River',
  'Delta',
  'Ebonyi',
  'Edo',
  'Ekiti',
  'Enugu',
  'Gombe',
  'Imo',
  'Jigawa',
  'Kaduna',
  'Kano',
  'Katsina',
  'Kebbi',
  'Kogi',
  'Kwara',
  'Lagos',
  'Nasarawa',
  'Niger',
  'Ogun',
  'Ondo',
  'Osun',
  'Oyo',
  'Plateau',
  'Rivers',
  'Sokoto',
  'Taraba',
  'Yobe',
  'Zamfara',
  'Federal Capital Territory',
];

/*
============================================================
NIGERIAN LGAs

The selected state determines the available LGA options.
============================================================
*/

const NIGERIAN_LGAS: Record<string, string[]> = {
  Abia: [
    'Aba North',
    'Aba South',
    'Arochukwu',
    'Bende',
    'Ikwuano',
    'Isiala Ngwa North',
    'Isiala Ngwa South',
    'Isuikwuato',
    'Obi Ngwa',
    'Ohafia',
    'Osisioma Ngwa',
    'Ugwunagbo',
    'Ukwa East',
    'Ukwa West',
    'Umuahia North',
    'Umuahia South',
    'Umunneochi',
  ],

  Adamawa: [
    'Demsa',
    'Fufore',
    'Ganye',
    'Girei',
    'Gombi',
    'Guyuk',
    'Hong',
    'Jada',
    'Lamurde',
    'Madagali',
    'Maiha',
    'Mayo Belwa',
    'Michika',
    'Mubi North',
    'Mubi South',
    'Numan',
    'Shelleng',
    'Song',
    'Toungo',
    'Yola North',
    'Yola South',
  ],

  'Akwa Ibom': [
    'Abak',
    'Eastern Obolo',
    'Eket',
    'Esit Eket',
    'Essien Udim',
    'Etim Ekpo',
    'Etinan',
    'Ibeno',
    'Ibesikpo Asutan',
    'Ibiono-Ibom',
    'Ika',
    'Ikono',
    'Ikot Abasi',
    'Ikot Ekpene',
    'Ini',
    'Itu',
    'Mbo',
    'Mkpat-Enin',
    'Nsit-Atai',
    'Nsit-Ibom',
    'Nsit-Ubium',
    'Obot Akara',
    'Okobo',
    'Onna',
    'Oron',
    'Oruk Anam',
    'Udung-Uko',
    'Ukanafun',
    'Uruan',
    'Urue-Offong/Oruko',
    'Uyo',
  ],

  Anambra: [
    'Aguata',
    'Anambra East',
    'Anambra West',
    'Anaocha',
    'Awka North',
    'Awka South',
    'Ayamelum',
    'Dunukofia',
    'Ekwusigo',
    'Idemili North',
    'Idemili South',
    'Ihiala',
    'Njikoka',
    'Nnewi North',
    'Nnewi South',
    'Ogbaru',
    'Onitsha North',
    'Onitsha South',
    'Orumba North',
    'Orumba South',
    'Oyi',
  ],

  Bauchi: [
    'Bauchi',
    'Bogoro',
    'Damban',
    'Darazo',
    'Dass',
    'Gamawa',
    'Ganjuwa',
    'Giade',
    'Itas/Gadau',
    'Jama’are',
    'Katagum',
    'Kirfi',
    'Misau',
    'Ningi',
    'Shira',
    'Tafawa Balewa',
    'Toro',
    'Warji',
    'Zaki',
  ],

  Bayelsa: [
    'Brass',
    'Ekeremor',
    'Kolokuma/Opokuma',
    'Nembe',
    'Ogbia',
    'Sagbama',
    'Southern Ijaw',
    'Yenagoa',
  ],

  Benue: [
    'Ado',
    'Agatu',
    'Apa',
    'Buruku',
    'Gboko',
    'Guma',
    'Gwer East',
    'Gwer West',
    'Katsina-Ala',
    'Konshisha',
    'Kwande',
    'Logo',
    'Makurdi',
    'Obi',
    'Ogbadibo',
    'Ohimini',
    'Oju',
    'Okpokwu',
    'Oturkpo',
    'Tarka',
    'Ukum',
    'Ushongo',
    'Vandeikya',
  ],

  Borno: [
    'Abadam',
    'Askira/Uba',
    'Bama',
    'Bayo',
    'Biu',
    'Chibok',
    'Damboa',
    'Dikwa',
    'Gubio',
    'Guzamala',
    'Gwoza',
    'Hawul',
    'Jere',
    'Kaga',
    'Kala/Balge',
    'Konduga',
    'Kukawa',
    'Kwaya Kusar',
    'Mafa',
    'Magumeri',
    'Maiduguri',
    'Marte',
    'Mobbar',
    'Monguno',
    'Ngala',
    'Nganzai',
    'Shani',
  ],

  'Cross River': [
    'Abi',
    'Akamkpa',
    'Akpabuyo',
    'Bakassi',
    'Bekwarra',
    'Biase',
    'Boki',
    'Calabar Municipal',
    'Calabar South',
    'Etung',
    'Ikom',
    'Obanliku',
    'Obubra',
    'Obudu',
    'Odukpani',
    'Ogoja',
    'Yakurr',
    'Yala',
  ],

  Delta: [
    'Aniocha North',
    'Aniocha South',
    'Bomadi',
    'Burutu',
    'Ethiope East',
    'Ethiope West',
    'Ika North East',
    'Ika South',
    'Isoko North',
    'Isoko South',
    'Ndokwa East',
    'Ndokwa West',
    'Okpe',
    'Oshimili North',
    'Oshimili South',
    'Patani',
    'Sapele',
    'Udu',
    'Ughelli North',
    'Ughelli South',
    'Ukwuani',
    'Uvwie',
    'Warri North',
    'Warri South',
    'Warri South West',
  ],

  Ebonyi: [
    'Abakaliki',
    'Afikpo North',
    'Afikpo South',
    'Ebonyi',
    'Ezza North',
    'Ezza South',
    'Ikwo',
    'Ishielu',
    'Ivo',
    'Izzi',
    'Ohaukwu',
    'Onicha',
  ],

  Edo: [
    'Akoko-Edo',
    'Egor',
    'Esan Central',
    'Esan North-East',
    'Esan South-East',
    'Esan West',
    'Etsako Central',
    'Etsako East',
    'Etsako West',
    'Igueben',
    'Ikpoba-Okha',
    'Oredo',
    'Orhionmwon',
    'Ovia North-East',
    'Ovia South-West',
    'Owan East',
    'Owan West',
    'Uhunmwonde',
  ],

  Ekiti: [
    'Ado Ekiti',
    'Efon',
    'Ekiti East',
    'Ekiti South-West',
    'Ekiti West',
    'Emure',
    'Gbonyin',
    'Ido Osi',
    'Ijero',
    'Ikere',
    'Ikole',
    'Ilejemeje',
    'Irepodun/Ifelodun',
    'Ise/Orun',
    'Moba',
    'Oye',
  ],

  Enugu: [
    'Aninri',
    'Awgu',
    'Enugu East',
    'Enugu North',
    'Enugu South',
    'Ezeagu',
    'Igbo Etiti',
    'Igbo Eze North',
    'Igbo Eze South',
    'Isi Uzo',
    'Nkanu East',
    'Nkanu West',
    'Nsukka',
    'Oji River',
    'Udenu',
    'Udi',
    'Uzo-Uwani',
  ],

  Gombe: [
    'Akko',
    'Balanga',
    'Billiri',
    'Dukku',
    'Funakaye',
    'Gombe',
    'Kaltungo',
    'Kwami',
    'Nafada',
    'Shongom',
    'Yamaltu/Deba',
  ],

  Imo: [
    'Aboh Mbaise',
    'Ahiazu Mbaise',
    'Ehime Mbano',
    'Ezinihitte',
    'Ideato North',
    'Ideato South',
    'Ihitte/Uboma',
    'Ikeduru',
    'Isiala Mbano',
    'Isu',
    'Mbaitoli',
    'Ngor Okpala',
    'Njaba',
    'Nkwerre',
    'Nwangele',
    'Obowo',
    'Oguta',
    'Ohaji/Egbema',
    'Okigwe',
    'Orlu',
    'Orsu',
    'Oru East',
    'Oru West',
    'Owerri Municipal',
    'Owerri North',
    'Owerri West',
  ],

  Jigawa: [
    'Auyo',
    'Babura',
    'Biriniwa',
    'Birnin Kudu',
    'Buji',
    'Dutse',
    'Gagarawa',
    'Garki',
    'Gumel',
    'Guri',
    'Gwaram',
    'Gwiwa',
    'Hadejia',
    'Jahun',
    'Kafin Hausa',
    'Kaugama',
    'Kazaure',
    'Kiri Kasama',
    'Kiyawa',
    'Maigatari',
    'Malam Madori',
    'Miga',
    'Ringim',
    'Roni',
    'Sule Tankarkar',
    'Taura',
    'Yankwashi',
  ],

  Kaduna: [
    'Birnin Gwari',
    'Chikun',
    'Giwa',
    'Igabi',
    'Ikara',
    'Jaba',
    'Jema’a',
    'Kachia',
    'Kaduna North',
    'Kaduna South',
    'Kagarko',
    'Kajuru',
    'Kaura',
    'Kauru',
    'Kubau',
    'Kudan',
    'Lere',
    'Makarfi',
    'Sabon Gari',
    'Sanga',
    'Soba',
    'Zangon Kataf',
    'Zaria',
  ],

  Kano: [
    'Ajingi',
    'Albasu',
    'Bagwai',
    'Bebeji',
    'Bichi',
    'Bunkure',
    'Dala',
    'Dambatta',
    'Dawakin Kudu',
    'Dawakin Tofa',
    'Doguwa',
    'Fagge',
    'Gabasawa',
    'Garko',
    'Garun Mallam',
    'Gaya',
    'Gezawa',
    'Gwale',
    'Gwarzo',
    'Kabo',
    'Kano Municipal',
    'Karaye',
    'Kibiya',
    'Kiru',
    'Kumbotso',
    'Kunchi',
    'Kura',
    'Madobi',
    'Makoda',
    'Minjibir',
    'Nasarawa',
    'Rano',
    'Rimin Gado',
    'Rogo',
    'Shanono',
    'Sumaila',
    'Takai',
    'Tarauni',
    'Tofa',
    'Tsanyawa',
    'Tudun Wada',
    'Ungogo',
    'Warawa',
    'Wudil',
  ],

  Katsina: [
    'Bakori',
    'Batagarawa',
    'Batsari',
    'Baure',
    'Bindawa',
    'Charanchi',
    'Dan Musa',
    'Dandume',
    'Danja',
    'Daura',
    'Dutsi',
    'Dutsin-Ma',
    'Faskari',
    'Funtua',
    'Ingawa',
    'Jibia',
    'Kafur',
    'Kaita',
    'Kankara',
    'Kankia',
    'Katsina',
    'Kurfi',
    'Kusada',
    'Mai’Adua',
    'Malumfashi',
    'Mani',
    'Mashi',
    'Matazu',
    'Musawa',
    'Rimi',
    'Sabuwa',
    'Safana',
    'Sandamu',
    'Zango',
  ],

  Kebbi: [
    'Aleiro',
    'Arewa Dandi',
    'Argungu',
    'Augie',
    'Bagudo',
    'Birnin Kebbi',
    'Bunza',
    'Dandi',
    'Fakai',
    'Gwandu',
    'Jega',
    'Kalgo',
    'Koko/Besse',
    'Maiyama',
    'Ngaski',
    'Sakaba',
    'Shanga',
    'Suru',
    'Wasagu/Danko',
    'Yauri',
    'Zuru',
  ],

  Kogi: [
    'Adavi',
    'Ajaokuta',
    'Ankpa',
    'Bassa',
    'Dekina',
    'Ibaji',
    'Idah',
    'Igalamela Odolu',
    'Ijumu',
    'Kabba/Bunu',
    'Kogi',
    'Lokoja',
    'Mopa-Muro',
    'Ofu',
    'Ogori/Magongo',
    'Okehi',
    'Okene',
    'Olamaboro',
    'Omala',
    'Yagba East',
    'Yagba West',
  ],

  Kwara: [
    'Asa',
    'Baruten',
    'Edu',
    'Ekiti',
    'Ifelodun',
    'Ilorin East',
    'Ilorin South',
    'Ilorin West',
    'Irepodun',
    'Isin',
    'Kaiama',
    'Moro',
    'Offa',
    'Oke Ero',
    'Oyun',
    'Pategi',
  ],

  Lagos: [
    'Agege',
    'Ajeromi-Ifelodun',
    'Alimosho',
    'Amuwo-Odofin',
    'Apapa',
    'Badagry',
    'Epe',
    'Eti-Osa',
    'Ibeju-Lekki',
    'Ifako-Ijaiye',
    'Ikeja',
    'Ikorodu',
    'Kosofe',
    'Lagos Island',
    'Lagos Mainland',
    'Mushin',
    'Ojo',
    'Oshodi-Isolo',
    'Shomolu',
    'Surulere',
  ],

  Nasarawa: [
    'Akwanga',
    'Awe',
    'Doma',
    'Karu',
    'Keana',
    'Keffi',
    'Kokona',
    'Lafia',
    'Nasarawa',
    'Nasarawa Eggon',
    'Obi',
    'Toto',
    'Wamba',
  ],

  Niger: [
    'Agaie',
    'Agwara',
    'Bida',
    'Borgu',
    'Bosso',
    'Chanchaga',
    'Edati',
    'Gbako',
    'Gurara',
    'Katcha',
    'Kontagora',
    'Lapai',
    'Lavun',
    'Magama',
    'Mariga',
    'Mashegu',
    'Mokwa',
    'Munya',
    'Paikoro',
    'Rafi',
    'Rijau',
    'Shiroro',
    'Suleja',
    'Tafa',
    'Wushishi',
  ],

  Ogun: [
    'Abeokuta North',
    'Abeokuta South',
    'Ado-Odo/Ota',
    'Ewekoro',
    'Ifo',
    'Ijebu East',
    'Ijebu North',
    'Ijebu North East',
    'Ijebu Ode',
    'Ikenne',
    'Imeko Afon',
    'Ipokia',
    'Obafemi Owode',
    'Odeda',
    'Odogbolu',
    'Ogun Waterside',
    'Remo North',
    'Sagamu',
    'Yewa North',
    'Yewa South',
  ],

  Ondo: [
    'Akoko North-East',
    'Akoko North-West',
    'Akoko South-East',
    'Akoko South-West',
    'Akure North',
    'Akure South',
    'Ese Odo',
    'Idanre',
    'Ifedore',
    'Ilaje',
    'Ile Oluji/Okeigbo',
    'Irele',
    'Odigbo',
    'Okitipupa',
    'Ondo East',
    'Ondo West',
    'Ose',
    'Owo',
  ],

  Osun: [
    'Atakunmosa East',
    'Atakunmosa West',
    'Ayedaade',
    'Ayedire',
    'Boluwaduro',
    'Boripe',
    'Ede North',
    'Ede South',
    'Egbedore',
    'Ejigbo',
    'Ife Central',
    'Ife East',
    'Ife North',
    'Ife South',
    'Ifedayo',
    'Ila',
    'Ilesa East',
    'Ilesa West',
    'Irepodun',
    'Irewole',
    'Isokan',
    'Iwo',
    'Obokun',
    'Odo Otin',
    'Ola Oluwa',
    'Olorunda',
    'Oriade',
    'Orolu',
    'Osogbo',
  ],

  Oyo: [
    'Afijio',
    'Akinyele',
    'Atiba',
    'Atisbo',
    'Egbeda',
    'Ibadan North',
    'Ibadan North-East',
    'Ibadan North-West',
    'Ibadan South-East',
    'Ibadan South-West',
    'Ibarapa Central',
    'Ibarapa East',
    'Ibarapa North',
    'Ido',
    'Irepo',
    'Iseyin',
    'Itesiwaju',
    'Iwajowa',
    'Kajola',
    'Lagelu',
    'Ogbomoso North',
    'Ogbomoso South',
    'Ogo Oluwa',
    'Olorunsogo',
    'Oluyole',
    'Ona Ara',
    'Orelope',
    'Ori Ire',
    'Oyo East',
    'Oyo West',
    'Saki East',
    'Saki West',
    'Surulere',
  ],

  Plateau: [
    'Barkin Ladi',
    'Bassa',
    'Bokkos',
    'Jos East',
    'Jos North',
    'Jos South',
    'Kanam',
    'Kanke',
    'Langtang North',
    'Langtang South',
    'Mangu',
    'Mikang',
    'Pankshin',
    'Qua’an Pan',
    'Riyom',
    'Shendam',
    'Wase',
  ],

  Rivers: [
    'Abua/Odual',
    'Ahoada East',
    'Ahoada West',
    'Akuku-Toru',
    'Andoni',
    'Asari-Toru',
    'Bonny',
    'Degema',
    'Eleme',
    'Emohua',
    'Etche',
    'Gokana',
    'Ikwerre',
    'Khana',
    'Obio/Akpor',
    'Ogba/Egbema/Ndoni',
    'Ogu/Bolo',
    'Okrika',
    'Omuma',
    'Opobo/Nkoro',
    'Oyigbo',
    'Port Harcourt',
    'Tai',
  ],

  Sokoto: [
    'Binji',
    'Bodinga',
    'Dange Shuni',
    'Gada',
    'Goronyo',
    'Gudu',
    'Gwadabawa',
    'Illela',
    'Isa',
    'Kebbe',
    'Kware',
    'Rabah',
    'Sabon Birni',
    'Shagari',
    'Silame',
    'Sokoto North',
    'Sokoto South',
    'Tambuwal',
    'Tangaza',
    'Tureta',
    'Wamako',
    'Wurno',
    'Yabo',
  ],

  Taraba: [
    'Ardo Kola',
    'Bali',
    'Donga',
    'Gashaka',
    'Gassol',
    'Ibi',
    'Jalingo',
    'Karim Lamido',
    'Kumi',
    'Lau',
    'Sardauna',
    'Takum',
    'Ussa',
    'Wukari',
    'Yorro',
    'Zing',
  ],

  Yobe: [
    'Bade',
    'Bursari',
    'Damaturu',
    'Fika',
    'Fune',
    'Geidam',
    'Gujba',
    'Gulani',
    'Jakusko',
    'Karasuwa',
    'Machina',
    'Nangere',
    'Nguru',
    'Potiskum',
    'Tarmuwa',
    'Yunusari',
    'Yusufari',
  ],

  Zamfara: [
    'Anka',
    'Bakura',
    'Birnin Magaji/Kiyaw',
    'Bukkuyum',
    'Bungudu',
    'Gummi',
    'Gusau',
    'Isa',
    'Kaura Namoda',
    'Maradun',
    'Maru',
    'Shinkafi',
    'Talata Mafara',
    'Tsafe',
    'Zurmi',
  ],

  'Federal Capital Territory': [
    'Abaji',
    'Bwari',
    'Gwagwalada',
    'Kuje',
    'Kwali',
    'Municipal Area Council',
  ],
};

/*
============================================================
SOUTH AFRICA
============================================================
*/

const SOUTH_AFRICAN_PROVINCES = [
  'Eastern Cape',
  'Free State',
  'Gauteng',
  'KwaZulu-Natal',
  'Limpopo',
  'Mpumalanga',
  'Northern Cape',
  'North West',
  'Western Cape',
];

const Profile: React.FC = () => {
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);
  const [account, setAccount] =
    useState<Account | null>(null);

  const [editing, setEditing] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState('');

  const [error, setError] =
    useState('');

  const [form, setForm] = useState({
    email: '',
    phone: '',
    dateOfBirth: '',
    address: '',
    city: '',
    state: '',
    lga: '',
    country: 'Nigeria',
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = () => {
    try {
      const savedUser = JSON.parse(
        localStorage.getItem(
          'zenimonies_user'
        ) || 'null'
      );

      const savedAccounts = JSON.parse(
        localStorage.getItem(
          'zenimonies_accounts'
        ) || '[]'
      );

      if (!savedUser) {
        navigate('/login');
        return;
      }

      setUser(savedUser);

      setForm({
        email: savedUser.email || '',
        phone: savedUser.phone || '',
        dateOfBirth:
          savedUser.date_of_birth ||
          savedUser.dob ||
          '',
        address:
          savedUser.residential_address ||
          savedUser.address ||
          '',
        city: savedUser.city || '',
        state: savedUser.state || '',
        lga: savedUser.lga || '',
        country:
          savedUser.country ||
          'Nigeria',
      });

      if (
        Array.isArray(savedAccounts) &&
        savedAccounts.length > 0
      ) {
        setAccount(savedAccounts[0]);
      }
    } catch (err) {
      console.error(
        'Profile loading error:',
        err
      );

      setError(
        'Unable to load your profile.'
      );
    }
  };

  const displayName =
    user?.full_name ||
    user?.name ||
    `${user?.first_name || ''} ${
      user?.last_name || ''
    }`.trim() ||
    'Zenimonies User';

  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map(
      (part) => part.charAt(0)
    )
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const kycStatus = String(
    user?.kyc_status || ''
  ).toLowerCase();

  const isKycVerified =
    kycStatus === 'verified' ||
    kycStatus === 'approved' ||
    kycStatus === 'completed' ||
    user?.is_verified === true;

  const stateOptions =
    form.country === 'Nigeria'
      ? NIGERIAN_STATES
      : SOUTH_AFRICAN_PROVINCES;

  const lgaOptions =
    form.country === 'Nigeria' &&
    form.state
      ? NIGERIAN_LGAS[
          form.state
        ] || []
      : [];

  const updateField = (
    field: keyof typeof form,
    value: string
  ) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleCountryChange = (
    value: string
  ) => {
    setForm((previous) => ({
      ...previous,
      country: value,
      state: '',
      lga: '',
    }));
  };

  const handleStateChange = (
    value: string
  ) => {
    setForm((previous) => ({
      ...previous,
      state: value,
      lga: '',
    }));
  };

  const handleSave = () => {
    setSaving(true);
    setMessage('');
    setError('');

    try {
      const updatedUser: User = {
        ...(user || {}),
        email: form.email,
        phone: form.phone,
        date_of_birth:
          form.dateOfBirth,
        dob: form.dateOfBirth,
        address: form.address,
        residential_address:
          form.address,
        city: form.city,
        state: form.state,
        lga: form.lga,
        country: form.country,
      };

      localStorage.setItem(
        'zenimonies_user',
        JSON.stringify(updatedUser)
      );

      setUser(updatedUser);
      setEditing(false);
      setMessage(
        'Profile updated successfully.'
      );
    } catch (err) {
      console.error(
        'Profile save error:',
        err
      );

      setError(
        'Unable to save your profile.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    loadProfile();
    setEditing(false);
    setMessage('');
    setError('');
  };

  return (
    <div style={styles.page}>
      {/* HEADER */}
      <header style={styles.header}>
        <button
          type="button"
          onClick={() => navigate('/')}
          style={styles.backButton}
        >
          ←
        </button>

        <div style={styles.headerTitle}>
          My Profile
        </div>

        <button
          type="button"
          onClick={() => navigate('/')}
          style={styles.homeButton}
        >
          Home
        </button>
      </header>

      <main style={styles.main}>
        {/* PROFILE SUMMARY */}
        <section style={styles.profileCard}>
          <div style={styles.avatar}>
            {user?.profile_photo ||
            user?.avatar ? (
              <img
                src={
                  user.profile_photo ||
                  user.avatar
                }
                alt="Profile"
                style={styles.avatarImage}
              />
            ) : (
              initials || 'Z'
            )}
          </div>

          <div style={styles.profileInfo}>
            <h1 style={styles.profileName}>
              {displayName}
            </h1>

            <p style={styles.emailText}>
              {user?.email ||
                'Email not available'}
            </p>

            <span
              style={{
                ...styles.statusBadge,
                ...(isKycVerified
                  ? styles.verifiedBadge
                  : styles.notVerifiedBadge),
              }}
            >
              {isKycVerified
                ? '✓ KYC Verified'
                : 'KYC Not Verified'}
            </span>
          </div>

          {!editing && (
            <button
              type="button"
              onClick={() => {
                setEditing(true);
                setMessage('');
                setError('');
              }}
              style={styles.editButton}
            >
              Edit Profile
            </button>
          )}
        </section>

        {/* MESSAGES */}
        {message && (
          <div style={styles.success}>
            ✓ {message}
          </div>
        )}

        {error && (
          <div style={styles.error}>
            {error}
          </div>
        )}

        {/* PERSONAL INFORMATION */}
        <section style={styles.card}>
          <h2 style={styles.sectionTitle}>
            Personal Information
          </h2>

          <p style={styles.description}>
            Keep your personal information
            up to date.
          </p>

          <div style={styles.grid}>
            {/* FULL NAME */}
            <div style={styles.field}>
              <label style={styles.label}>
                Full Legal Name
              </label>

              <input
                type="text"
                value={displayName}
                disabled
                style={{
                  ...styles.input,
                  ...styles.disabledInput,
                }}
              />

              {isKycVerified && (
                <small style={styles.helper}>
                  🔒 Your verified legal name
                  cannot be changed here.
                </small>
              )}
            </div>

            {/* DATE OF BIRTH */}
            <div style={styles.field}>
              <label style={styles.label}>
                Date of Birth
              </label>

              <input
                type="date"
                value={form.dateOfBirth}
                disabled={!editing}
                onChange={(event) =>
                  updateField(
                    'dateOfBirth',
                    event.target.value
                  )
                }
                style={{
                  ...styles.input,
                  ...(editing
                    ? styles.editableInput
                    : styles.disabledInput),
                }}
              />
            </div>

            {/* EMAIL */}
            <div style={styles.field}>
              <label style={styles.label}>
                Email Address
              </label>

              <input
                type="email"
                value={form.email}
                disabled={!editing}
                onChange={(event) =>
                  updateField(
                    'email',
                    event.target.value
                  )
                }
                style={{
                  ...styles.input,
                  ...(editing
                    ? styles.editableInput
                    : styles.disabledInput),
                }}
              />
            </div>

            {/* PHONE */}
            <div style={styles.field}>
              <label style={styles.label}>
                Phone Number
              </label>

              <input
                type="tel"
                value={form.phone}
                disabled={!editing}
                onChange={(event) =>
                  updateField(
                    'phone',
                    event.target.value
                  )
                }
                style={{
                  ...styles.input,
                  ...(editing
                    ? styles.editableInput
                    : styles.disabledInput),
                }}
              />
            </div>
          </div>
        </section>

        {/* RESIDENTIAL ADDRESS */}
        <section style={styles.card}>
          <h2 style={styles.sectionTitle}>
            Residential Address
          </h2>

          <p style={styles.description}>
            Select your country, state and
            Local Government Area.
          </p>

          <div style={styles.grid}>
            {/* COUNTRY */}
            <div style={styles.field}>
              <label style={styles.label}>
                Country
              </label>

              <select
                value={form.country}
                disabled={!editing}
                onChange={(event) =>
                  handleCountryChange(
                    event.target.value
                  )
                }
                style={{
                  ...styles.input,
                  ...(editing
                    ? styles.editableInput
                    : styles.disabledInput),
                }}
              >
                <option value="Nigeria">
                  Nigeria
                </option>

                <option value="South Africa">
                  South Africa
                </option>
              </select>
            </div>

            {/* STATE / PROVINCE */}
            <div style={styles.field}>
              <label style={styles.label}>
                {form.country === 'Nigeria'
                  ? 'State'
                  : 'Province'}
              </label>

              <select
                value={form.state}
                disabled={!editing}
                onChange={(event) =>
                  handleStateChange(
                    event.target.value
                  )
                }
                style={{
                  ...styles.input,
                  ...(editing
                    ? styles.editableInput
                    : styles.disabledInput),
                }}
              >
                <option value="">
                  Select{' '}
                  {form.country === 'Nigeria'
                    ? 'State'
                    : 'Province'}
                </option>

                {stateOptions.map(
                  (state) => (
                    <option
                      key={state}
                      value={state}
                    >
                      {state}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* LGA */}
            {form.country === 'Nigeria' && (
              <div style={styles.field}>
                <label style={styles.label}>
                  Local Government Area
                </label>

                <select
                  value={form.lga}
                  disabled={
                    !editing ||
                    !form.state
                  }
                  onChange={(event) =>
                    updateField(
                      'lga',
                      event.target.value
                    )
                  }
                  style={{
                    ...styles.input,
                    ...(!editing ||
                    !form.state
                      ? styles.disabledInput
                      : styles.editableInput),
                  }}
                >
                  <option value="">
                    {!form.state
                      ? 'Select a State first'
                      : 'Select LGA'}
                  </option>

                  {lgaOptions.map(
                    (lga) => (
                      <option
                        key={lga}
                        value={lga}
                      >
                        {lga}
                      </option>
                    )
                  )}
                </select>
              </div>
            )}

            {/* CITY */}
            <div style={styles.field}>
              <label style={styles.label}>
                City / Town
              </label>

              <input
                type="text"
                value={form.city}
                disabled={!editing}
                placeholder="Enter your city or town"
                onChange={(event) =>
                  updateField(
                    'city',
                    event.target.value
                  )
                }
                style={{
                  ...styles.input,
                  ...(editing
                    ? styles.editableInput
                    : styles.disabledInput),
                }}
              />
            </div>

            {/* ADDRESS */}
            <div
              style={{
                ...styles.field,
                gridColumn: '1 / -1',
              }}
            >
              <label style={styles.label}>
                Residential Address
              </label>

              <textarea
                value={form.address}
                disabled={!editing}
                placeholder="Enter your full residential address"
                rows={4}
                onChange={(event) =>
                  updateField(
                    'address',
                    event.target.value
                  )
                }
                style={{
                  ...styles.input,
                  ...styles.textarea,
                  ...(editing
                    ? styles.editableInput
                    : styles.disabledInput),
                }}
              />
            </div>
          </div>
        </section>

        {/* ACCOUNT INFORMATION */}
        <section style={styles.card}>
          <h2 style={styles.sectionTitle}>
            Account Information
          </h2>

          <div style={styles.accountGrid}>
            <div>
              <span style={styles.accountLabel}>
                Account Number
              </span>

              <strong style={styles.accountValue}>
                {account?.account_number ||
                  'Not available'}
              </strong>
            </div>

            <div>
              <span style={styles.accountLabel}>
                Account Type
              </span>

              <strong style={styles.accountValue}>
                {account?.account_type ||
                  'Personal'}
              </strong>
            </div>

            <div>
              <span style={styles.accountLabel}>
                Currency
              </span>

              <strong style={styles.accountValue}>
                {account?.currency || 'NGN'}
              </strong>
            </div>

            <div>
              <span style={styles.accountLabel}>
                Status
              </span>

              <strong style={styles.accountValue}>
                {account?.status || 'Active'}
              </strong>
            </div>
          </div>
        </section>

        {/* ACTION BUTTONS */}
        {editing && (
          <div style={styles.actions}>
            <button
              type="button"
              onClick={handleCancel}
              disabled={saving}
              style={styles.cancelButton}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              style={styles.saveButton}
            >
              {saving
                ? 'Saving...'
                : 'Save Changes'}
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

/*
============================================================
STYLES
============================================================
*/

const styles: Record<
  string,
  React.CSSProperties
> = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#f5f7f6',
    color: '#17211b',
    fontFamily:
      'Arial, Helvetica, sans-serif',
    paddingBottom: '50px',
  },

  header: {
    minHeight: '64px',
    backgroundColor: '#087a4b',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    padding: '0 16px',
    gap: '12px',
    boxSizing: 'border-box',
  },

  backButton: {
    border: 'none',
    background: 'transparent',
    color: '#ffffff',
    fontSize: '28px',
    cursor: 'pointer',
    padding: '5px 8px',
  },

  headerTitle: {
    flex: 1,
    fontSize: '20px',
    fontWeight: 700,
  },

  homeButton: {
    border: '1px solid rgba(255,255,255,0.5)',
    backgroundColor: 'transparent',
    color: '#ffffff',
    borderRadius: '8px',
    padding: '8px 12px',
    cursor: 'pointer',
    fontWeight: 600,
  },

  main: {
    width: '100%',
    maxWidth: '900px',
    margin: '0 auto',
    padding: '22px 16px',
    boxSizing: 'border-box',
  },

  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: '18px',
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    boxShadow:
      '0 4px 18px rgba(0,0,0,0.06)',
    marginBottom: '18px',
    flexWrap: 'wrap',
  },

  avatar: {
    width: '72px',
    height: '72px',
    minWidth: '72px',
    borderRadius: '50%',
    backgroundColor: '#087a4b',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    fontWeight: 800,
    overflow: 'hidden',
  },

  avatarImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },

  profileInfo: {
    flex: 1,
    minWidth: '180px',
  },

  profileName: {
    margin: 0,
    fontSize: '21px',
    fontWeight: 800,
  },

  emailText: {
    margin: '5px 0 9px',
    color: '#69756e',
    fontSize: '14px',
  },

  statusBadge: {
    display: 'inline-block',
    borderRadius: '20px',
    padding: '6px 10px',
    fontSize: '12px',
    fontWeight: 700,
  },

  verifiedBadge: {
    backgroundColor: '#e5f7ed',
    color: '#087a4b',
  },

  notVerifiedBadge: {
    backgroundColor: '#fff4df',
    color: '#916100',
  },

  editButton: {
    border: 'none',
    backgroundColor: '#087a4b',
    color: '#ffffff',
    borderRadius: '9px',
    padding: '11px 15px',
    cursor: 'pointer',
    fontWeight: 700,
  },

  success: {
    backgroundColor: '#e7f7ee',
    color: '#087a4b',
    padding: '13px 15px',
    borderRadius: '10px',
    marginBottom: '15px',
    fontWeight: 600,
  },

  error: {
    backgroundColor: '#fdeaea',
    color: '#b42318',
    padding: '13px 15px',
    borderRadius: '10px',
    marginBottom: '15px',
    fontWeight: 600,
  },

  card: {
    backgroundColor: '#ffffff',
    borderRadius: '18px',
    padding: '21px',
    boxShadow:
      '0 4px 18px rgba(0,0,0,0.06)',
    marginBottom: '18px',
  },

  sectionTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 800,
  },

  description: {
    margin: '6px 0 20px',
    color: '#69756e',
    fontSize: '14px',
  },

  grid: {
    display: 'grid',
    gridTemplateColumns:
      'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '17px',
  },

  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '7px',
  },

  label: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#344039',
  },

  input: {
    width: '100%',
    boxSizing: 'border-box',
    border: '1px solid #d6ddd8',
    borderRadius: '9px',
    padding: '12px',
    fontSize: '15px',
    color: '#17211b',
    backgroundColor: '#ffffff',
    outline: 'none',
  },

  editableInput: {
    border: '1px solid #087a4b',
    backgroundColor: '#ffffff',
  },

  disabledInput: {
    backgroundColor: '#f1f3f2',
    color: '#68736d',
    cursor: 'not-allowed',
  },

  textarea: {
    resize: 'vertical',
    minHeight: '100px',
    fontFamily:
      'Arial, Helvetica, sans-serif',
  },

  helper: {
    color: '#69756e',
    fontSize: '11px',
  },

  accountGrid: {
    display: 'grid',
    gridTemplateColumns:
      'repeat(auto-fit, minmax(170px, 1fr))',
    gap: '20px',
  },

  accountLabel: {
    display: 'block',
    color: '#69756e',
    fontSize: '12px',
    marginBottom: '5px',
  },

  accountValue: {
    display: 'block',
    fontSize: '15px',
  },

  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '5px',
  },

  cancelButton: {
    border: '1px solid #cbd3ce',
    backgroundColor: '#ffffff',
    color: '#344039',
    borderRadius: '9px',
    padding: '12px 18px',
    cursor: 'pointer',
    fontWeight: 700,
  },

  saveButton: {
    border: 'none',
    backgroundColor: '#087a4b',
    color: '#ffffff',
    borderRadius: '9px',
    padding: '12px 20px',
    cursor: 'pointer',
    fontWeight: 700,
  },
};

export default Profile;
