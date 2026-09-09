DO $$
DECLARE
  c uuid := '8559e919-3d02-477c-890a-fcb4ebb58d6e';
  inv_growatt uuid; inv_deye uuid; inv_fronius uuid; inv_solis uuid;
  mod_canadian uuid; mod_ja uuid; mod_trina uuid;
  bank_bv uuid; bank_santander uuid; bank_sol uuid;
BEGIN
  INSERT INTO public.solar_inverters (company_id,name,brand,model,power_kw,mppt_count,input_count,phases,efficiency,price,description,is_active)
  VALUES (c,'Growatt MIN 5000TL-X','Growatt','MIN 5000TL-X',5,2,2,1,98.4,4200,'Inversor string monofásico 220V','t')
  RETURNING id INTO inv_growatt;
  INSERT INTO public.solar_inverters (company_id,name,brand,model,power_kw,mppt_count,input_count,phases,efficiency,price,description,is_active)
  VALUES (c,'Deye SUN-8K-G03','Deye','SUN-8K-G03',8,2,4,3,98.2,7600,'Inversor trifásico 380V','t')
  RETURNING id INTO inv_deye;
  INSERT INTO public.solar_inverters (company_id,name,brand,model,power_kw,mppt_count,input_count,phases,efficiency,price,description,is_active)
  VALUES (c,'Fronius Primo 10.0-1','Fronius','Primo 10.0-1',10,2,4,1,98,11800,'Inversor premium europeu','t')
  RETURNING id INTO inv_fronius;
  INSERT INTO public.solar_inverters (company_id,name,brand,model,power_kw,mppt_count,input_count,phases,efficiency,price,description,is_active)
  VALUES (c,'Solis S6-GC20K','Solis','S6-GC20K',20,2,4,3,98.6,15400,'Inversor trifásico para comercial','t')
  RETURNING id INTO inv_solis;

  INSERT INTO public.solar_modules (company_id,name,brand,model,power_wp,technology,width_mm,height_mm,weight_kg,price,description,is_active)
  VALUES (c,'Canadian 550W','Canadian Solar','HiKu6 CS6W-550MS',550,'Monocristalino PERC',1134,2261,27.5,690,'Módulo 550Wp meia célula','t')
  RETURNING id INTO mod_canadian;
  INSERT INTO public.solar_modules (company_id,name,brand,model,power_wp,technology,width_mm,height_mm,weight_kg,price,description,is_active)
  VALUES (c,'JA Solar 610W','JA Solar','JAM72D40-610/LB',610,'N-Type TOPCon Bifacial',1134,2382,32,780,'Módulo bifacial de alta eficiência','t')
  RETURNING id INTO mod_ja;
  INSERT INTO public.solar_modules (company_id,name,brand,model,power_wp,technology,width_mm,height_mm,weight_kg,price,description,is_active)
  VALUES (c,'Trina Vertex S+ 445W','Trina Solar','TSM-445NEG9R.28',445,'N-Type TOPCon',1134,1762,21.5,560,'Módulo compacto para telhados pequenos','t')
  RETURNING id INTO mod_trina;

  INSERT INTO public.solar_kits (company_id,name,inverter_id,module_id,module_quantity,kwp_total,price,description,is_active) VALUES
    (c,'Kit 5,5 kWp - Residencial Básico',inv_growatt,mod_canadian,10,5.5,18900,'Ideal para consumo médio de 600 kWh/mês','t'),
    (c,'Kit 8,25 kWp - Residencial Plus',inv_deye,mod_canadian,15,8.25,27400,'Consumo médio de 900 kWh/mês','t'),
    (c,'Kit 12,2 kWp - Comercial Leve',inv_fronius,mod_ja,20,12.2,41800,'Pequenos comércios','t'),
    (c,'Kit 24,4 kWp - Comercial',inv_solis,mod_ja,40,24.4,79500,'Comércios e indústrias leves','t'),
    (c,'Kit 4,45 kWp - Compacto',inv_growatt,mod_trina,10,4.45,15900,'Telhados com pouca área','t');

  INSERT INTO public.solar_utilities (company_id,name,state,tariff_kwh,minimum_fee,price,description,is_active) VALUES
    (c,'Equatorial Maranhão','MA',0.9812,55.20,0,'Concessionária do MA','t'),
    (c,'Equatorial Pará','PA',0.9435,52.80,0,'Concessionária do PA','t'),
    (c,'Cemig','MG',0.9120,48.90,0,'Concessionária de MG','t'),
    (c,'Enel SP','SP',0.8745,45.60,0,'Concessionária de SP','t'),
    (c,'Coelba','BA',0.9268,50.10,0,'Concessionária da BA','t');

  INSERT INTO public.solar_cities (company_id,name,state,latitude,longitude,
    irradiance_jan,irradiance_fev,irradiance_mar,irradiance_abr,irradiance_mai,irradiance_jun,
    irradiance_jul,irradiance_ago,irradiance_set,irradiance_out,irradiance_nov,irradiance_dez,description,is_active) VALUES
    (c,'São Luís','MA',-2.5297,-44.3028,5.12,4.88,4.71,4.83,5.09,5.34,5.47,5.86,6.05,5.92,5.63,5.31,'Capital do MA','t'),
    (c,'Imperatriz','MA',-5.5264,-47.4917,5.28,5.04,4.95,5.11,5.38,5.62,5.79,6.12,6.21,5.84,5.52,5.36,'Sul do MA','t'),
    (c,'Bacabal','MA',-4.2250,-44.7800,5.19,4.96,4.82,4.99,5.27,5.51,5.68,6.01,6.14,5.79,5.48,5.29,'Centro do MA','t'),
    (c,'Teresina','PI',-5.0892,-42.8019,5.41,5.12,5.02,5.18,5.49,5.74,5.92,6.24,6.35,6.02,5.71,5.48,'Capital do PI','t'),
    (c,'Belém','PA',-1.4558,-48.5039,4.72,4.55,4.48,4.61,4.87,5.13,5.29,5.58,5.72,5.54,5.26,4.94,'Capital do PA','t'),
    (c,'Belo Horizonte','MG',-19.9167,-43.9345,5.86,6.02,5.54,5.11,4.72,4.48,4.62,5.18,5.49,5.62,5.38,5.71,'Capital de MG','t');

  INSERT INTO public.solar_roof_types (company_id,name,loss_factor,price,description,is_active) VALUES
    (c,'Cerâmico',2.00,0,'Telha cerâmica colonial','t'),
    (c,'Fibrocimento',2.50,180,'Telha de fibrocimento ondulada','t'),
    (c,'Metálico Trapezoidal',1.50,120,'Telha metálica trapezoidal','t'),
    (c,'Laje',3.00,450,'Estrutura com suporte triangular','t'),
    (c,'Solo (Ground)',1.00,900,'Usina em solo com estrutura metálica','t');

  INSERT INTO public.solar_orientations (company_id,name,azimuth,loss_factor,description,is_active) VALUES
    (c,'Norte',0,0,'Orientação ideal no hemisfério sul','t'),
    (c,'Nordeste',45,3.50,'Boa geração pela manhã','t'),
    (c,'Noroeste',315,3.50,'Boa geração à tarde','t'),
    (c,'Leste',90,10.00,'Geração concentrada na manhã','t'),
    (c,'Oeste',270,10.00,'Geração concentrada à tarde','t'),
    (c,'Sul',180,20.00,'Menor geração, evitar quando possível','t');

  INSERT INTO public.solar_connection_types (company_id,name,phases,voltage,minimum_kwh,description,is_active) VALUES
    (c,'Monofásico',1,220,30,'Taxa mínima de 30 kWh','t'),
    (c,'Bifásico',2,220,50,'Taxa mínima de 50 kWh','t'),
    (c,'Trifásico',3,380,100,'Taxa mínima de 100 kWh','t');

  INSERT INTO public.solar_financing_banks (company_id,name,description,is_active)
  VALUES (c,'BV Financeira','Financiamento solar com carência de até 90 dias','t') RETURNING id INTO bank_bv;
  INSERT INTO public.solar_financing_banks (company_id,name,description,is_active)
  VALUES (c,'Santander','Linha CDC Solar','t') RETURNING id INTO bank_santander;
  INSERT INTO public.solar_financing_banks (company_id,name,description,is_active)
  VALUES (c,'Solfácil','Especializada em energia solar','t') RETURNING id INTO bank_sol;

  INSERT INTO public.solar_financing_terms (company_id,bank_id,term_months,monthly_interest_rate,is_active) VALUES
    (c,bank_bv,24,1.79,'t'),(c,bank_bv,36,1.85,'t'),(c,bank_bv,48,1.92,'t'),(c,bank_bv,60,1.99,'t'),
    (c,bank_santander,36,1.69,'t'),(c,bank_santander,60,1.82,'t'),(c,bank_santander,72,1.95,'t'),
    (c,bank_sol,60,1.59,'t'),(c,bank_sol,84,1.72,'t'),(c,bank_sol,120,1.89,'t');

  INSERT INTO public.solar_pricing_config (company_id,margin_percent,price_per_km,base_visit_fee,annual_tariff_inflation_percent,annual_module_degradation_percent)
  VALUES (c,22.00,3.50,150.00,8.50,0.55)
  ON CONFLICT (company_id) DO UPDATE SET
    margin_percent = EXCLUDED.margin_percent,
    price_per_km = EXCLUDED.price_per_km,
    base_visit_fee = EXCLUDED.base_visit_fee,
    annual_tariff_inflation_percent = EXCLUDED.annual_tariff_inflation_percent,
    annual_module_degradation_percent = EXCLUDED.annual_module_degradation_percent;
END $$;