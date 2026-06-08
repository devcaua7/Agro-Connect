import Layout from "@/components/Layout";
import { PlusCircle, Upload } from "lucide-react";
import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { allCategories } from "@/components/CategoryList";

const Anunciar = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [priceUnit, setPriceUnit] = useState("kg");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!user) {
    navigate("/login");
    return null;
  }

  const formatBRL = (digits: string) => {
    const n = Number(digits) / 100;
    return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "");
    if (!digits) {
      setPrice("");
      return;
    }
    setPrice(formatBRL(digits));
  };

  const parsePrice = (formatted: string) => {
    const digits = formatted.replace(/\D/g, "");
    return digits ? Number(digits) / 100 : NaN;
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedPrice = parsePrice(price);
    if (!name || !parsedPrice || isNaN(parsedPrice) || !category) {
      toast.error("Preencha os campos obrigatórios.");
      return;
    }

    setLoading(true);
    let imageUrl: string | null = null;

    if (imageFile) {
      const fileExt = imageFile.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(fileName, imageFile);
      if (uploadError) {
        toast.error("Erro ao enviar imagem.");
        setLoading(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(fileName);
      imageUrl = urlData.publicUrl;
    }

    const { error } = await supabase.from("products").insert({
      user_id: user.id,
      name,
      price: parsedPrice,
      price_unit: priceUnit,
      category,
      description: description || null,
      city: city || null,
      image_url: imageUrl,
    });

    if (error) {
      toast.error("Erro ao criar anúncio: " + error.message);
    } else {
      toast.success("Anúncio publicado!");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      navigate("/");
    }
    setLoading(false);
  };

  return (
    <Layout>
      <div className="px-4 md:px-8 pt-6 md:pt-8 max-w-2xl">
        <h2 className="text-2xl font-bold text-foreground mb-6">Criar Anúncio</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Nome do produto *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Tomate Orgânico" required
              className="w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Preço *</label>
              <input type="text" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Ex: 5.00" required
                className="w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Unidade</label>
              <select value={priceUnit} onChange={(e) => setPriceUnit(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="kg">por kg</option>
                <option value="un">por unidade</option>
                <option value="cx">por caixa</option>
                <option value="dz">por dúzia</option>
                <option value="lt">por litro</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Categoria *</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} required
              className="w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="">Selecione</option>
              {allCategories.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Cidade</label>
            <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ex: Campinas, SP"
              className="w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Descrição</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Descreva seu produto..."
              className="w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Fotos</label>
            <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
            <div onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center text-muted-foreground hover:border-primary/40 transition-colors cursor-pointer">
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="w-32 h-32 object-cover rounded-lg" />
              ) : (
                <>
                  <Upload className="w-8 h-8 mb-2" />
                  <span className="text-sm">Clique para enviar fotos</span>
                </>
              )}
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 active:scale-[0.97] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50">
            <PlusCircle className="w-4 h-4" />
            {loading ? "Publicando..." : "Publicar Anúncio"}
          </button>
        </form>
      </div>
    </Layout>
  );
};

export default Anunciar;
