'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { ShoppingBag, KeyRound, LogOut, MessageCircle, X, ChevronLeft, ChevronRight, ImagePlus, Trash2 } from 'lucide-react';
import Link from 'next/link';

const fallbackProducts = [2,3,4,5,6,7].map(id => ({
  id,
  name: `Producto Estrella ${id}`,
  description: 'Este es un producto maravilloso de la línea de Farmasi con propiedades increíbles para tu cuidado personal.',
  price: 250.00,
  image: `/Productos/${id}.jpeg`,
  extra_images: [] as string[],
  category: id % 2 === 0 ? 'women' : 'men'
}));

export default function Home() {
  const [showSplash, setShowSplash] = useState(true);
  const [session, setSession] = useState<{user: {email?: string}} | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [products, setProducts] = useState(fallbackProducts);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedEvidence, setSelectedEvidence] = useState<string | null>(null);
  const [dbEvidences, setDbEvidences] = useState<{id: string, image: string}[]>([]);

  // Modal specific states
  const [editForm, setEditForm] = useState({ name: '', description: '', price: 0, extra_images: [] as string[] });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [imgIndex, setImgIndex] = useState(0);

  const menSectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2500);
    fetchProducts();
    fetchEvidences();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session as any);
      checkAdmin(session?.user?.email);
    });
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session as any);
      checkAdmin(session?.user?.email);
    });
    return () => {
      clearTimeout(timer);
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          document.body.classList.add('theme-men');
        } else {
          document.body.classList.remove('theme-men');
        }
      },
      { threshold: 0.25 }
    );
    if (menSectionRef.current) observer.observe(menSectionRef.current);
    return () => {
      if (menSectionRef.current) observer.unobserve(menSectionRef.current);
      document.body.classList.remove('theme-men');
    };
  }, [products]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase.from('products').select('*').order('id', { ascending: true });
      if (data && data.length > 0) {
        setProducts(data);
      }
    } catch(err) {
      console.log('Using local fallback products due to error:', err);
    }
  }

  const fetchEvidences = async () => {
    try {
      const { data } = await supabase.from('evidence').select('*').order('created_at', { ascending: false });
      if (data) setDbEvidences(data);
    } catch (e) {}
  };

  const checkAdmin = async (email?: string) => {
    if (!email) return setIsAdmin(false);
    if (email === 'andrecn643@gmail.com') return setIsAdmin(true);
    try {
      const { data } = await supabase.from('admins').select('email').eq('email', email);
      setIsAdmin(!!(data && data.length > 0));
    } catch (e) {
      setIsAdmin(false);
    }
  };
  const signInWithGoogle = async () => await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
  const handleLogout = async () => await supabase.auth.signOut();
  
  const orderWhatsApp = (productName: string) => {
    const number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '9993446149';
    const msg = encodeURIComponent(`¡Hola! Me encantó el producto ${productName} de Farmasi y quisiera pedirlo.`);
    window.open(`https://wa.me/${number}?text=${msg}`, '_blank');
  };

  const handleEditClick = (prod: any) => {
    setSelectedProduct(prod);
    setEditForm({ name: prod.name, description: prod.description, price: prod.price, extra_images: prod.extra_images || [] });
    setImgIndex(0);
  };

  const handleSaveProduct = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase.from('products').update({
        name: editForm.name,
        description: editForm.description,
        price: editForm.price,
        extra_images: editForm.extra_images
      }).eq('id', selectedProduct.id);
      if (error) console.warn('Error saving to BD.', error.message);
    } catch(e) {}
    setProducts(products.map(p => p.id === selectedProduct.id ? { ...p, ...editForm } : p));
    setIsSaving(false);
    setSelectedProduct(null);
  };

  const handleDeleteProduct = async () => {
    if (!confirm(`¿Estás completamente seguro de borrar "${selectedProduct.name}"? Esta acción no se puede deshacer.`)) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('products').delete().eq('id', selectedProduct.id);
      if (error) alert("Error al eliminar: " + error.message);
      else {
        setProducts(products.filter(p => p.id !== selectedProduct.id));
        setSelectedProduct(null);
      }
    } catch (error) {}
    setIsDeleting(false);
  };

  const handleAddExtraPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) {
         alert("La imagen es muy pesada (Max 4MB)");
         return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
         const newBase64 = reader.result as string;
         setEditForm(prev => {
            const newArr = [...prev.extra_images, newBase64];
            // Immediately jump carousel to the new photo
            setImgIndex(newArr.length); // length = index of the newly added last photo (0-indexed taking base image into account)
            return { ...prev, extra_images: newArr };
         });
      };
      reader.readAsDataURL(file);
    }
  };

  const womenProducts = products.filter(p => p.category !== 'men');
  const menProducts = products.filter(p => p.category === 'men');

  // Carousel Mechanics
  // Depending on whether we are tweaking images in editForm, dynamically generate carousel active array
  const currentCarouselContext = selectedProduct ? [selectedProduct.image, ...(editForm.extra_images || [])] : [];
  
  const prevImage = () => setImgIndex(old => old === 0 ? currentCarouselContext.length - 1 : old - 1);
  const nextImage = () => setImgIndex(old => old === currentCarouselContext.length - 1 ? 0 : old + 1);

  // Generar lista final de evidencias (Base de datos + Locales)
  const dynamicEvidences = dbEvidences.map(e => ({ id: `db-${e.id}`, src: e.image }));
  const localEvidences = [1,2,3,4,5,6,8,9].map(idx => ({ id: `local-${idx}`, src: `/Evidencias/${idx}.jpeg` }));
  const allEvidences = [...dynamicEvidences, ...localEvidences];
  // Duplicar para efecto marquee (scroll infinito)
  const marqueeEvidences = [...allEvidences, ...allEvidences, ...allEvidences];

  return (
    <>
      <div className={`splash-container ${!showSplash ? 'hide' : ''}`}>
        <h1 className="splash-text">Farmasi</h1>
      </div>

      <header className="header">
        <div className="header-logo">Farmasi ✨</div>
        <div className="header-actions">
          {session ? (
            <>
              {isAdmin && <Link href="/admin" className="btn" style={{border: '1px solid var(--border-light)'}}><KeyRound size={18}/> Administrador</Link>}
              <button onClick={handleLogout} className="btn"><LogOut size={18}/> Salir</button>
            </>
          ) : (
            <button onClick={signInWithGoogle} className="btn btn-primary"><KeyRound size={18}/> Ingresar</button>
          )}
        </div>
      </header>

      <section className="evidences-section">
        <h2 className="section-title">Evidencias</h2>
        <div className="marquee-container">
          <div className="marquee-track">
             {marqueeEvidences.map((ev, i) => (
                <div key={`${ev.id}-${i}`} className="evidence-card" onClick={() => setSelectedEvidence(ev.src)}>
                  <img src={ev.src} alt={`Evidencia ${i}`} />
                </div>
             ))}
          </div>
        </div>
      </section>

      {/* SECCIÓN MUJERES */}
      <section className="products-section">
        <h2 className="section-title">Línea Femenina</h2>
        <div className="products-grid">
          {womenProducts.map((prod) => (
             <div key={prod.id} className="product-card" onClick={() => handleEditClick(prod)} style={{cursor: 'pointer'}}>
               <div className="product-image-container">
                  <img src={prod.image} alt={prod.name} />
               </div>
               <div className="product-info">
                  <h3 className="product-title">{prod.name}</h3>
                  <div style={{fontWeight: 'bold', color: 'var(--primary-accent)', marginBottom: '0.5rem'}}>${prod.price} MXN</div>
                  <p className="product-desc" style={{display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'}}>{prod.description}</p>
                  <div className="product-actions" onClick={e => e.stopPropagation()}>
                    <button onClick={() => orderWhatsApp(prod.name)} className="btn btn-primary"><MessageCircle size={18}/> Pedir</button>
                    {isAdmin && <button onClick={() => handleEditClick(prod)} className="btn">📝 Editar</button>}
                  </div>
               </div>
             </div>
          ))}
        </div>
      </section>

      {/* SECCIÓN HOMBRES */}
      {menProducts.length > 0 && (
        <section className="products-section" ref={menSectionRef} style={{marginTop: '4rem', paddingBottom: '8rem'}}>
          <h2 className="section-title" style={{color: 'var(--primary-accent)'}}>Línea Masculina</h2>
          <div className="products-grid">
            {menProducts.map((prod) => (
               <div key={prod.id} className="product-card" onClick={() => handleEditClick(prod)} style={{cursor: 'pointer'}}>
                 <div className="product-image-container">
                    <img src={prod.image} alt={prod.name} />
                 </div>
                 <div className="product-info">
                    <h3 className="product-title">{prod.name}</h3>
                    <div style={{fontWeight: 'bold', color: 'var(--primary-accent)', marginBottom: '0.5rem'}}>${prod.price} MXN</div>
                    <p className="product-desc" style={{display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'}}>{prod.description}</p>
                    <div className="product-actions" onClick={e => e.stopPropagation()}>
                      <button onClick={() => orderWhatsApp(prod.name)} className="btn btn-primary"><MessageCircle size={18}/> Pedir</button>
                      {isAdmin && <button onClick={() => handleEditClick(prod)} className="btn">📝 Editar</button>}
                    </div>
                 </div>
               </div>
            ))}
          </div>
        </section>
      )}

      {/* PRODUCT MODAL */}
      {selectedProduct && (
        <div className="modal-overlay" onClick={() => setSelectedProduct(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedProduct(null)}>
              <X size={24} />
            </button>
            <div className="modal-image" style={{position: 'relative'}}>
              {/* CURRENT IMAGE */}
              <img src={currentCarouselContext[imgIndex]} alt={selectedProduct.name} style={{width: '100%', height: '100%', objectFit: 'cover', position: 'absolute'}}/>
              
              {/* ARROWS (ONLY IF > 1 IMAGE) */}
              {currentCarouselContext.length > 1 && (
                <>
                  <button onClick={prevImage} style={{position:'absolute', left:'10px', top:'50%', transform:'translateY(-50%)', background:'rgba(0,0,0,0.5)', color:'white', border:'none', borderRadius:'50%', padding:'0.5rem', cursor:'pointer', backdropFilter:'blur(5px)'}}>
                     <ChevronLeft size={24} />
                  </button>
                  <button onClick={nextImage} style={{position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)', background:'rgba(0,0,0,0.5)', color:'white', border:'none', borderRadius:'50%', padding:'0.5rem', cursor:'pointer', backdropFilter:'blur(5px)'}}>
                     <ChevronRight size={24} />
                  </button>
                  
                  {/* Paginación dots */}
                  <div style={{position:'absolute', bottom:'15px', width:'100%', display:'flex', justifyContent:'center', gap:'8px'}}>
                     {currentCarouselContext.map((_, i) => (
                        <div key={i} style={{width:'8px', height:'8px', borderRadius:'50%', background: i === imgIndex ? 'var(--primary-accent)' : 'rgba(255,255,255,0.6)', transition:'all 0.3s'}} />
                     ))}
                  </div>
                </>
              )}

              {/* ADD EXTRA PHOTO BUTTON (ADMIN OVERLAY) */}
              {isAdmin && (
                <div style={{position:'absolute', top:'15px', left:'15px'}}>
                   <input type="file" id="extra-image-upload" hidden accept="image/*" onChange={handleAddExtraPhoto} />
                   <label htmlFor="extra-image-upload" className="btn btn-primary" style={{display:'flex', alignItems:'center', gap:'0.5rem', cursor:'pointer', padding:'0.6rem 1rem', fontSize:'0.85rem', boxShadow:'0 10px 20px rgba(0,0,0,0.3)', border:'1px solid rgba(255,255,255,0.2)'}}>
                      <ImagePlus size={16}/> {currentCarouselContext.length > 1 ? 'Añadir 3ra+' : 'Añadir 2da Foto'}
                   </label>
                </div>
              )}
            </div>

            <div className="modal-details" style={{display: 'flex', flexDirection: 'column'}}>
              {isAdmin ? (
                <>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: '1rem'}}>
                    <h3 style={{color: 'var(--text-dark)', margin: 0}}>Modo Edición</h3>
                    <button onClick={handleDeleteProduct} disabled={isDeleting} style={{background:'transparent', border:'none', color:'red', display:'flex', gap:'0.4rem', alignItems:'center', cursor:'pointer', padding:'0.4rem', opacity:0.7}} title="Borrar Producto Dfinitivamente" onMouseOver={e => e.currentTarget.style.opacity='1'} onMouseOut={e => e.currentTarget.style.opacity='0.7'}>
                       {isDeleting ? 'Borrando...' : <Trash2 size={20} />}
                    </button>
                  </div>

                  <label style={{fontSize:'0.8rem', color:'gray', marginBottom:'0.2rem', textTransform: 'uppercase', letterSpacing: '0.1em'}}>Nombre del Producto</label>
                  <input type="text" className="input-field" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
                  <label style={{fontSize:'0.9rem', color:'gray', margin:'0.5rem 0 0.2rem'}}>Descripción o Especificaciones</label>
                  <textarea className="input-field" style={{flex: 1, minHeight: '120px'}} value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})}></textarea>
                  <label style={{fontSize:'0.9rem', color:'gray', margin:'0.5rem 0 0.2rem'}}>Precio (MXN)</label>
                  <input type="number" className="input-field" value={editForm.price} onChange={e => setEditForm({...editForm, price: parseFloat(e.target.value) || 0})} />
                  
                  <button className="btn btn-primary" style={{marginTop:'1.5rem', padding:'1rem', justifyContent:'center'}} onClick={handleSaveProduct} disabled={isSaving}>
                    {isSaving ? 'Guardando Info...' : 'Guardar Todos Los Cambios'}
                  </button>
                </>
              ) : (
                <>
                  <h2 style={{fontSize: '2.5rem', marginBottom: '0.5rem', fontFamily: 'Cormorant Garamond, serif', fontWeight: '500', color: 'var(--text-dark)'}}>{selectedProduct.name}</h2>
                  <div className="modal-price-large">${selectedProduct.price} MXN</div>
                  <p style={{fontSize: '1rem', lineHeight: '1.8', color: 'var(--text-light)', marginBottom: '2.5rem', fontWeight: '300'}}>
                    {selectedProduct.description}
                  </p>
                  <div style={{marginTop: 'auto', display: 'flex', gap: '1rem'}}>
                    <button onClick={() => orderWhatsApp(selectedProduct.name)} className="btn btn-primary" style={{padding: '1rem 2rem', fontSize: '1.1rem', flex: 1, justifyContent: 'center'}}>
                      <MessageCircle size={22}/> ¡Lo quiero pedir!
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* EVIDENCE LIGHTBOX */}
      {selectedEvidence && (
        <div className="modal-overlay" onClick={() => setSelectedEvidence(null)}>
          <div className="lightbox-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedEvidence(null)} style={{top: '-40px', right: '-15px', border: 'none', color: '#fff'}}><X size={28} /></button>
            <img src={selectedEvidence} alt="Evidencia Ampliada" />
          </div>
        </div>
      )}
    </>
  );
}
