/* Gestoría Paredes — requisitos por trámite (los usan la página principal y la de documentos) */
window.GP_REQ = {
  primera: {
    es: { label: 'Licencia nueva', titulo: 'Licencia por primera vez', nota: 'Requisitos para licencia de automovilista. Las licencias de motociclista, chofer y servicio público pueden requerir documentos adicionales; se los indicamos al iniciar.' },
    en: { label: 'New license', titulo: 'First-time license', nota: 'List for a standard driver license. Motorcycle, chauffeur and public-service licenses may need extra documents: we tell you when we start.' },
    grupos: [{ es: '', en: '', items: [
      ['Solicitud de licencia de IMOVEQROO', 'IMOVEQROO license application'],
      ['CURP actualizada', 'Updated CURP'],
      ['INE o pasaporte vigente', 'Valid INE voter ID or passport'],
      ['Comprobante de domicilio (luz o agua) no mayor a 3 meses', 'Proof of address (power or water bill) under 3 months old'],
      ['Certificado de manejo de IMOVEQROO, del municipio o de una escuela acreditada', 'Driving certificate from IMOVEQROO, the municipality or an accredited school'],
      ['Certificado de examen de la vista de una dependencia municipal o un particular acreditado', 'Eye-exam certificate from a municipal office or an accredited provider']
    ] }]
  },
  renovacion: {
    es: { label: 'Renovar licencia', titulo: 'Renovación de licencia', nota: 'Para renovar la licencia de automovilista no se requieren los certificados de manejo ni de examen de la vista. Otros tipos de licencia pueden requerir documentos adicionales.' },
    en: { label: 'Renew license', titulo: 'License renewal', nota: 'Renewing a standard driver license does not require the driving or eye certificates. Other license types may need extra documents.' },
    grupos: [{ es: '', en: '', items: [
      ['Solicitud de licencia de IMOVEQROO', 'IMOVEQROO license application'],
      ['INE o pasaporte vigente', 'Valid INE voter ID or passport'],
      ['Comprobante de domicilio (luz o agua) no mayor a 3 meses', 'Proof of address (power or water bill) under 3 months old'],
      ['Licencia anterior en original', 'Your previous license (original)']
    ] }]
  },
  emplacamiento: {
    es: { label: 'Emplacamiento', titulo: 'Emplacamiento', nota: 'Requisitos de referencia. Cada caso (auto nuevo, de otro estado o extranjero) puede requerir documentos adicionales; se los confirmamos al iniciar.' },
    en: { label: 'License plates', titulo: 'License plates', nota: 'Reference list. Each case (new car, from another state or foreign) may need extra documents; we confirm them when we start.' },
    grupos: [
      { es: 'EN TODOS LOS CASOS', en: 'ALL CASES', items: [
        ['Factura original, carta factura o título de propiedad (endosado si es usado)', 'Original invoice, invoice letter or title (endorsed if used)'],
        ['INE o pasaporte vigente', 'Valid INE voter ID or passport'],
        ['Comprobante de domicilio en Quintana Roo, reciente', 'Recent proof of address in Quintana Roo'],
        ['Inscripción en el Registro Estatal de Contribuyentes (REC)', 'Registration in the State Taxpayer Registry (REC)']
      ] },
      { es: 'SI VIENE DE OTRO ESTADO', en: 'FROM ANOTHER STATE', items: [
        ['Tarjeta de circulación y placas del estado de origen', 'Registration card and plates from the original state'],
        ['Baja vehicular del estado de origen, si se requiere', 'Deregistration from the original state, if required']
      ] },
      { es: 'AUTO EXTRANJERO', en: 'FOREIGN CAR', items: [
        ['Título de propiedad original', 'Original title'],
        ['Pedimento de importación definitiva con sello de caja, o documento que acredite su legal estancia en México', 'Permanent import declaration (pedimento) with customs stamp, or proof of legal stay in Mexico'],
        ['El vehículo presente para su revisión', 'The vehicle present for inspection']
      ] }
    ]
  },
  propietario: {
    es: { label: 'Cambio de propietario', titulo: 'Cambio de propietario', nota: 'Los vehículos importados, las placas extraviadas o las compras a nombre de una empresa requieren documentos adicionales; se los indicamos al iniciar.' },
    en: { label: 'Change of owner', titulo: 'Change of ownership', nota: 'Imported vehicles, lost plates or purchases by a company need extra documents: we tell you when we start.' },
    grupos: [
      { es: 'DEL VEHÍCULO', en: 'VEHICLE', items: [
        ['Tarjeta de circulación original', 'Original registration card'],
        ['Las dos placas (motocicleta: una)', 'Both plates (motorcycle: one)'],
        ['Factura original o carta factura', 'Original invoice or invoice letter'],
        ['Tenencias pagadas de los últimos 5 años, sin adeudos', 'Vehicle tax paid for the last 5 years, no debts'],
        ['El vehículo presente el día de la cita', 'The vehicle present on the appointment day']
      ] },
      { es: 'DEL VENDEDOR', en: 'SELLER', items: [
        ['INE vigente', 'Valid INE voter ID']
      ] },
      { es: 'DEL COMPRADOR', en: 'BUYER', items: [
        ['INE o pasaporte vigente', 'Valid INE voter ID or passport'],
        ['Licencia de conducir vigente', 'Valid driver license'],
        ['RFC', 'RFC'],
        ['Inscripción en el Registro Estatal de Contribuyentes (REC)', 'Registration in the State Taxpayer Registry (REC)'],
        ['Comprobante de domicilio a su nombre, no mayor a 60 días', 'Proof of address in your name, under 60 days old'],
        ['Teléfono y correo electrónico', 'Phone number and email']
      ] }
    ]
  }
};
window.GP_REQ_ORDER = ['primera', 'renovacion', 'propietario', 'emplacamiento'];
